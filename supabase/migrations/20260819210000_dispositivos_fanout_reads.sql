-- Política de lectura de dispositivos en modo sistema (sin claims JWT).
--
-- El fan-out de notificaciones necesita resolver los push tokens de los
-- destinatarios de un evento (p. ej. audiencia de un comunicado publicado).
-- Esa resolución ocurre en `uow.run` (sin `set_config('request.jwt.claims')`),
-- por lo que `current_setting('request.jwt.claims', true)` retorna NULL en
-- esas transacciones y las políticas previas (`dispositivos_propios_select`,
-- `_insert`, `_update`, `_delete`) que comparan contra `auth.jwt() ->> 'sub'`
-- evaluarían a falso y devolverían 0 filas.
--
-- Esta política abre SELECT solo en ese contexto (no bajo claims); combinada
-- por OR con `dispositivos_propios_select`, los efectos son:
--   * uow.run  (sistema)    → ve todos los dispositivos.
--   * uow.runAs(publisher)  → solo ve los dispositivos del propio usuario.
-- INSERT/UPDATE/DELETE siguen siendo estrictamente por dueño; no se relajan.
CREATE POLICY dispositivos_select_sistema ON dispositivos
  FOR SELECT TO app_bff
  USING (
    current_setting('request.jwt.claims', true) IS NULL
  );
