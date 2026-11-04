-- ═══════════════════════════════════════════════════════════════════
-- Migración: PERSONAL exclusivo del dueño (privacidad)
-- Los eventos PERSONAL son de uso exclusivo del usuario que los creó —
-- NINGÚN rol ajeno los lee, ni siquiera ADMIN. Precedente en el sistema:
-- historial médico (solo el propio estudiante; ARCHITECTURE.md L67).
--
-- Se corrige el bypass de SELECT: la rama ADMIN de eventos_select
-- devolvía TODOS los eventos (incl. PERSONAL de otros) por
-- corto-circuito. Nueva regla: ADMIN ve todo lo NO-PERSONAL; el dueño
-- (de cualquier rol, incl. ADMIN) sigue viendo el suyo. La escritura
-- (UPDATE/DELETE) ya era owner-only para PERSONAL: queda alineada.
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS eventos_select ON eventos;

-- SELECT: ADMIN (todo menos el PERSONAL de otros); INSTITUCIONAL/FERIADO
-- visibles a todos; PERSONAL solo el dueño; OFICIAL GLOBAL o por
-- audiencia de decanato del claim.
CREATE POLICY eventos_select ON eventos FOR SELECT USING (
  (
    (auth.jwt() ->> 'role') = 'ADMIN'
    AND tipo <> 'PERSONAL'
  )
  OR tipo IN ('INSTITUCIONAL','FERIADO')
  OR (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
  OR (
    tipo = 'OFICIAL'
    AND (
      NOT EXISTS (SELECT 1 FROM evento_audiencias ea WHERE ea.evento_id = eventos.id)
      OR EXISTS (
        SELECT 1 FROM evento_audiencias ea
        WHERE ea.evento_id = eventos.id
          AND ea.decanato_id = (auth.jwt() ->> 'decanato_id')::int
      )
    )
  )
);
