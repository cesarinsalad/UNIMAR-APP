-- ═══════════════════════════════════════════════════════════════════
-- Migración: notificaciones_base
-- Paso 3 — bandeja in-app + RLS
-- ═══════════════════════════════════════════════════════════════════

-- Bandeja de notificaciones por usuario. El fan-out de comunicaciones puede
-- insertar filas para otros usuarios dentro de la transacción del publicador.
CREATE TABLE notificaciones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo          text NOT NULL
                CHECK (tipo IN ('COMUNICADO_PUBLICADO','COMUNICADO_RECHAZADO')),
  titulo        text NOT NULL,
  cuerpo        text NOT NULL,
  referencia_id uuid REFERENCES comunicados(id) ON DELETE SET NULL,
  leida         boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Índice principal de la bandeja y del contador de no leídas.
CREATE INDEX idx_notificaciones_bandeja
  ON notificaciones (usuario_id, leida, created_at DESC);

-- El fan-out consulta los tokens de todos los destinatarios en una sola query.
CREATE INDEX idx_dispositivos_usuario ON dispositivos (usuario_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON notificaciones TO app_bff;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_bff;

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- El BFF inserta notificaciones generadas por eventos para usuarios distintos
-- del usuario cuyos claims están activos en la transacción.
CREATE POLICY notificaciones_insert ON notificaciones
  FOR INSERT TO app_bff WITH CHECK (true);

-- La bandeja solo expone filas del usuario autenticado.
CREATE POLICY notificaciones_select ON notificaciones
  FOR SELECT USING (usuario_id = (auth.jwt() ->> 'sub')::uuid);

CREATE POLICY notificaciones_update ON notificaciones
  FOR UPDATE
  USING (usuario_id = (auth.jwt() ->> 'sub')::uuid)
  WITH CHECK (usuario_id = (auth.jwt() ->> 'sub')::uuid);

CREATE POLICY notificaciones_delete ON notificaciones
  FOR DELETE USING (usuario_id = (auth.jwt() ->> 'sub')::uuid);
