-- ═══════════════════════════════════════════════════════════════════
-- Migración: alcance agregado de comunicados para el dashboard de gestión
--
-- La RLS de `comunicado_lecturas` solo expone filas al autor o al ADMIN.
-- El producto, sin embargo, permite al COMUNICADOR ver estadísticas de los
-- comunicados que alcanzan su decanato. Para no relajar la RLS (que expone
-- `usuario_id`), esta función SECURITY DEFINER devuelve SOLO agregados:
-- lecturas y audiencia objetivo por comunicado. Nunca devuelve lectores.
--
-- Garantías:
--   1. Exige claims activos: `uow.runAs(claims)` los inyecta en la tx.
--   2. Solo ADMIN o COMUNICADOR pueden invocarla.
--   3. El alcance replica `puedeVerEstadisticas`: ADMIN ve todo; el
--      COMUNICADOR ve sus comunicados, los globales y los dirigidos a su
--      decanato.
--   4. Audiencia objetivo = estudiantes registrados en la app dentro de
--      los decanatos de la audiencia (o todos si es GLOBAL).
--   5. EXECUTE solo para app_bff; PUBLIC revocado.
-- ═══════════════════════════════════════════════════════════════════
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

-- Apoyo a la consulta: publicados por fecha y estudiantes por decanato.
CREATE INDEX IF NOT EXISTS idx_comunicados_publicado_at
  ON public.comunicados (estado, publicado_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_decanato
  ON public.usuarios (decanato_id);
