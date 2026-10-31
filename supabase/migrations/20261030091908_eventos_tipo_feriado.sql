-- ═══════════════════════════════════════════════════════════════════
-- Migración: tipo FERIADO
-- Día no laborable del calendario institucional (puentes, recesos,
-- efemérides). Semántica idéntica a INSTITUCIONAL: lo crea solo el ADMIN,
-- todos lo ven automáticamente (RLS) y no participa en la pivot
-- evento_participantes — solo cambia el scope para que la UI lo pinte
-- con su color propio (terracota) en la agenda.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE eventos DROP CONSTRAINT eventos_tipo_check;
ALTER TABLE eventos ADD CONSTRAINT eventos_tipo_check
  CHECK (tipo IN ('OFICIAL','PERSONAL','INSTITUCIONAL','FERIADO'));

-- ═══ RLS: re-crear las 4 políticas con el nuevo tipo ═══════════════
-- Mismo tratamiento que INSTITUCIONAL: SELECT universal, escritura solo ADMIN.

DROP POLICY eventos_select  ON eventos;
DROP POLICY eventos_insert  ON eventos;
DROP POLICY eventos_update  ON eventos;
DROP POLICY eventos_delete  ON eventos;

-- SELECT: ADMIN todo; INSTITUCIONAL/FERIADO visibles a todos; PERSONAL
-- propio; OFICIAL igual que antes (GLOBAL o por audiencia de decanato).
CREATE POLICY eventos_select ON eventos FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'ADMIN'
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

-- INSERT: INSTITUCIONAL/FERIADO solo ADMIN (global por definición, sin audiencia).
CREATE POLICY eventos_insert ON eventos FOR INSERT WITH CHECK (
  (
    tipo = 'PERSONAL'
    AND (auth.jwt() ->> 'role') IN ('ESTUDIANTE','COMUNICADOR','ADMIN')
    AND usuario_id = (auth.jwt() ->> 'sub')::uuid
  ) OR (
    tipo = 'OFICIAL'
    AND (auth.jwt() ->> 'role') IN ('COMUNICADOR','ADMIN')
  ) OR (
    tipo IN ('INSTITUCIONAL','FERIADO')
    AND (auth.jwt() ->> 'role') = 'ADMIN'
  )
);

-- UPDATE/DELETE: solo ADMIN para INSTITUCIONAL/FERIADO (no admiten audiencia).
CREATE POLICY eventos_update ON eventos FOR UPDATE
  USING      (
    (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    OR (tipo = 'OFICIAL' AND (
      (auth.jwt() ->> 'role') = 'ADMIN'
      OR ((auth.jwt() ->> 'role') = 'COMUNICADOR' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    ))
    OR (tipo IN ('INSTITUCIONAL','FERIADO') AND (auth.jwt() ->> 'role') = 'ADMIN')
  )
  WITH CHECK (
    (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    OR (tipo = 'OFICIAL' AND (
      (auth.jwt() ->> 'role') = 'ADMIN'
      OR ((auth.jwt() ->> 'role') = 'COMUNICADOR' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    ))
    OR (tipo IN ('INSTITUCIONAL','FERIADO') AND (auth.jwt() ->> 'role') = 'ADMIN')
  );

CREATE POLICY eventos_delete ON eventos FOR DELETE USING (
  (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
  OR (tipo = 'OFICIAL' AND (
    (auth.jwt() ->> 'role') = 'ADMIN'
    OR ((auth.jwt() ->> 'role') = 'COMUNICADOR' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
  ))
  OR (tipo IN ('INSTITUCIONAL','FERIADO') AND (auth.jwt() ->> 'role') = 'ADMIN')
);
