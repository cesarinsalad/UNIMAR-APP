-- ═══════════════════════════════════════════════════════════════════
-- Migración: borrado lógico de comunicados (deleted_at)
--
-- Sustituye la decisión de `20260813200000_comunicaciones_base.sql`
-- ("No creamos política de DELETE"): el borrado FÍSICO sigue prohibido,
-- pero un comunicado puede retirarse por completo con `deleted_at`.
-- Motivo: un BORRADOR/PENDIENTE no tenía ninguna salida (archivar exige
-- PUBLICADO), así que los comunicados de prueba quedaban atrapados.
--
-- Reglas:
--   * Autor o ADMIN marcan `deleted_at` (misma política UPDATE ya
--     existente: no se crea política DELETE).
--   * La RLS de SELECT oculta lo eliminado al PÚBLICO (estudiantes/lectores).
--     Autor y ADMIN conservan acceso directo a sus filas: PostgreSQL evalúa
--     la política SELECT también sobre la fila NUEVA de un UPDATE, así que
--     ocultársela a ambos rompería el propio soft delete. El repositorio
--     filtra `deleted_at IS NULL` en TODAS sus consultas, de modo que en la
--     app desaparece para todos. Restaurar es SQL manual con `postgres`.
--   * Adjuntos y portada quedan intactos: no se borra la fila, así que
--     no hay cascadas ni objetos huérfanos en Storage.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.comunicados
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.usuarios(id);

COMMENT ON COLUMN public.comunicados.deleted_at IS
  'Borrado lógico: invisible para el público vía app_bff (RLS); el repositorio filtra deleted_at IS NULL. Restaurar = SQL manual.';

-- ── RLS SELECT: lo eliminado no lo ve el público ──
-- Autor/ADMIN conservan acceso directo (necesario para que el UPDATE de
-- soft delete pase el chequeo SELECT sobre la fila nueva); el repositorio
-- filtra deleted_at IS NULL en todas las consultas de la app.
DROP POLICY IF EXISTS comunicados_select ON public.comunicados;
CREATE POLICY comunicados_select ON public.comunicados FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'ADMIN'
  OR autor_id = (auth.jwt() ->> 'sub')::uuid
  OR (
    deleted_at IS NULL
    AND estado = 'PUBLICADO'
    AND (programado_para IS NULL OR programado_para <= now())
    AND (expira_at IS NULL OR expira_at > now())
    AND (
      -- GLOBAL: no hay filas de audiencia
      NOT EXISTS (SELECT 1 FROM comunicado_audiencias ca WHERE ca.comunicado_id = comunicados.id)
      -- O el decanato del usuario está en la audiencia
      OR EXISTS (
        SELECT 1 FROM comunicado_audiencias ca
        WHERE ca.comunicado_id = comunicados.id
          AND ca.decanato_id = (auth.jwt() ->> 'decanato_id')::int
      )
    )
  )
);

-- NOTA: `comunicados_update` (autor/ADMIN) cubre el soft delete
-- (`UPDATE ... SET deleted_at`). Se re-crea con `deleted_at IS NULL` en el
-- USING para que un comunicado ya eliminado no pueda editarse ni
-- "resucitarse" vía app_bff; el WITH CHECK sigue validando autor/ADMIN
-- sobre la fila nueva (que ya tiene deleted_at). El borrado físico sigue
-- sin política.
DROP POLICY IF EXISTS comunicados_update ON public.comunicados;
CREATE POLICY comunicados_update ON public.comunicados FOR UPDATE
  USING (
    deleted_at IS NULL
    AND ((auth.jwt() ->> 'role') = 'ADMIN' OR autor_id = (auth.jwt() ->> 'sub')::uuid)
  )
  WITH CHECK ((auth.jwt() ->> 'role') = 'ADMIN' OR autor_id = (auth.jwt() ->> 'sub')::uuid);

-- ── Dashboard: excluir eliminados del alcance agregado ──
CREATE OR REPLACE FUNCTION public.alcance_comunicados(p_dias integer DEFAULT 30)
RETURNS TABLE (
  comunicado_id uuid,
  titulo text,
  publicado_at timestamptz,
  lecturas integer,
  audiencia integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims jsonb;
  v_rol text;
  v_decanato integer;
  v_desde timestamptz;
BEGIN
  IF p_dias IS NULL OR p_dias < 1 OR p_dias > 365 THEN
    RAISE EXCEPTION 'p_dias debe estar entre 1 y 365';
  END IF;

  v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  IF v_claims IS NULL THEN
    RAISE EXCEPTION 'alcance_comunicados requiere claims de usuario activos';
  END IF;

  v_rol := v_claims ->> 'role';
  IF v_rol NOT IN ('ADMIN', 'COMUNICADOR') THEN
    RAISE EXCEPTION 'rol no autorizado para consultar alcance';
  END IF;

  v_decanato := NULLIF(v_claims ->> 'decanato_id', '')::integer;
  v_desde := now() - make_interval(days => p_dias);

  RETURN QUERY
  WITH publicados AS (
    SELECT
      c.id,
      c.titulo,
      c.publicado_at,
      (SELECT count(*)::int
         FROM public.comunicado_lecturas l
        WHERE l.comunicado_id = c.id) AS lecturas,
      CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM public.comunicado_audiencias ca WHERE ca.comunicado_id = c.id
        ) THEN (
          SELECT count(*)::int
            FROM public.usuarios u
            JOIN public.roles r ON r.id = u.rol_id
           WHERE r.nombre = 'ESTUDIANTE'
        )
        ELSE (
          SELECT count(DISTINCT u.id)::int
            FROM public.usuarios u
            JOIN public.roles r ON r.id = u.rol_id
           WHERE r.nombre = 'ESTUDIANTE'
             AND u.decanato_id IN (
               SELECT ca.decanato_id
                 FROM public.comunicado_audiencias ca
                WHERE ca.comunicado_id = c.id
             )
        )
      END AS audiencia
      FROM public.comunicados c
     WHERE c.estado = 'PUBLICADO'
       AND c.deleted_at IS NULL
       AND c.publicado_at >= v_desde
       AND (c.programado_para IS NULL OR c.programado_para <= now())
       AND (
         v_rol = 'ADMIN'
         OR c.autor_id = (v_claims ->> 'sub')::uuid
         OR NOT EXISTS (
           SELECT 1 FROM public.comunicado_audiencias ca WHERE ca.comunicado_id = c.id
         )
         OR EXISTS (
           SELECT 1
             FROM public.comunicado_audiencias ca
            WHERE ca.comunicado_id = c.id
              AND ca.decanato_id = v_decanato
         )
       )
  )
  SELECT p.id, p.titulo, p.publicado_at, p.lecturas, p.audiencia
    FROM publicados p
   ORDER BY p.publicado_at DESC, p.id DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.alcance_comunicados(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alcance_comunicados(integer) TO app_bff;

-- Listados y dashboard siempre filtran por vigentes: índice parcial que
-- acompaña el ORDER BY created_at DESC de la consola.
CREATE INDEX IF NOT EXISTS idx_comunicados_vigentes
  ON public.comunicados (created_at DESC) WHERE deleted_at IS NULL;
