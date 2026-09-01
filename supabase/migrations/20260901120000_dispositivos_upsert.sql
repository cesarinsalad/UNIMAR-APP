-- ═══════════════════════════════════════════════════════════════════
-- Migración: dispositivos_upsert (reasignar_dispositivo)
-- Reasignación controlada del push_token al usuario autenticado.
--
-- Camino explícito de elevación de privilegios: en lugar de relajar las
-- políticas RLS de la tabla `dispositivos` (que siguen siendo fail-closed por
-- dueño), la reasignación se hace llamando a esta función SECURITY DEFINER
-- desde `RegistrarDispositivo` bajo una transacción `uow.runAs(claims)`.
--
-- Garantías:
--   1. La función NO se puede invocar sin claims activos: si
--      `request.jwt.claims` es NULL/vacío (modo sistema), RAISE EXCEPTION.
--      Esto impide reasignaciones accidentales desde `uow.run`.
--   2. El `p_usuario_id` debe coincidir con `claims.sub` (defensa en
--      profundidad: aunque el BFF ya lo garantiza, el RPC lo verifica).
--   3. Las validaciones de `push_token` y `plataforma` se duplican dentro de
--      la función (Zod ya valida en el borde HTTP).
--   4. EXECUTE solo para `app_bff`; PUBLIC revocado. El cliente móvil nunca
--      accede a Postgres directamente.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reasignar_dispositivo(
  p_token text,
  p_usuario_id uuid,
  p_plataforma text
)
RETURNS SETOF public.dispositivos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims_sub text;
BEGIN
  -- (1) Fail-closed: requiere identidad autenticada en la transacción.
  v_claims_sub := current_setting('request.jwt.claims', true);
  IF v_claims_sub IS NULL OR v_claims_sub = '' THEN
    RAISE EXCEPTION 'reasignar_dispositivo requiere claims de usuario activos';
  END IF;

  -- (2) El usuario solicitado debe coincidir con los claims activos.
  IF p_usuario_id::text IS DISTINCT FROM ((v_claims_sub)::jsonb ->> 'sub') THEN
    RAISE EXCEPTION 'usuario_id no coincide con la identidad autenticada';
  END IF;

  -- (3) Validación de entradas (defensa duplicada con Zod).
  IF p_token IS NULL OR btrim(p_token) = '' OR length(p_token) > 500 THEN
    RAISE EXCEPTION 'push_token inválido';
  END IF;
  IF p_plataforma NOT IN ('android', 'ios', 'web') THEN
    RAISE EXCEPTION 'plataforma inválida';
  END IF;

  RETURN QUERY
  INSERT INTO public.dispositivos (usuario_id, push_token, plataforma)
  VALUES (p_usuario_id, p_token, p_plataforma)
  ON CONFLICT (push_token) DO UPDATE
    SET usuario_id = EXCLUDED.usuario_id,
        plataforma = EXCLUDED.plataforma,
        ultimo_uso_at = now()
  RETURNING *;
END;
$$;

-- (4) Solo el BFF puede invocar la función.
REVOKE ALL ON FUNCTION public.reasignar_dispositivo(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reasignar_dispositivo(text, uuid, text) TO app_bff;