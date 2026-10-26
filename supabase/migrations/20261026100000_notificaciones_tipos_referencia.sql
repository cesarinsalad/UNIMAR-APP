-- ═══════════════════════════════════════════════════════════════════
-- Migración: notificaciones_tipos_referencia
-- Alinea el esquema con los tipos ya declarados en el shared kernel
-- (`src/shared/kernel/tiposNotificacion.ts`) y con docs/onboarding-frontend.md.
--
-- 1. El CHECK original solo contemplaba COMUNICADO_PUBLICADO/_RECHAZADO,
--    pero el fan-out de Calendario inserta EVENTO_OFICIAL_CREADO (dentro
--    del tx de CrearEvento) y el job de recordatorios inserta
--    EVENTO_RECORDATORIO: sin este fix, POST /eventos OFICIAL revienta
--    el tx completo y el job falla en cada tick.
-- 2. `referencia_id` es polimórfica (comunicado | evento | materia):
--    una FK a comunicados(id) es inválida para los demás tipos y no
--    puede haber FK a dos tablas; se elimina y la integridad queda en
--    la capa de aplicación (fans-outs del bus), como documenta el kernel.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE notificaciones
  DROP CONSTRAINT notificaciones_tipo_check;

ALTER TABLE notificaciones
  ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo IN (
    'COMUNICADO_PUBLICADO',
    'COMUNICADO_RECHAZADO',
    'EVENTO_OFICIAL_CREADO',
    'EVENTO_RECORDATORIO',
    'NOTA_PUBLICADA'
  ));

ALTER TABLE notificaciones
  DROP CONSTRAINT notificaciones_referencia_id_fkey;
