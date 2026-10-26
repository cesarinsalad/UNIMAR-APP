-- ═══════════════════════════════════════════════════════════════════
-- Migración: evento_participantes + tipo INSTITUCIONAL
-- Agenda personal: PERSONAL (propios) + OFICIALES agregados + INSTITUCIONALES
-- ═══════════════════════════════════════════════════════════════════

-- ── Pivot usuario↔evento ("agregar a mi agenda") ──
-- Solo aplica a eventos OFICIALES (el caso de uso lo valida): los PERSONAL
-- ya están en la agenda de su dueño vía RLS y los INSTITUCIONAL se muestran
-- a todos automáticamente. FK CASCADE: si el evento o usuario desaparece,
-- la participación desaparece con él.
CREATE TABLE evento_participantes (
  evento_id   uuid NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  agregado_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, usuario_id)
);

-- Índice por usuario: la agenda filtra "lo que agregué" con EXISTS por usuario.
CREATE INDEX idx_evento_participantes_usuario ON evento_participantes (usuario_id);

GRANT SELECT, INSERT, DELETE ON evento_participantes TO app_bff;

-- ── Nuevo tipo INSTITUCIONAL: fechas fijas del calendario académico ──
-- Los crea el ADMIN, todos los usuarios los ven automáticamente (RLS),
-- no se agregan ni se quitan de la agenda: siempre están.
ALTER TABLE eventos DROP CONSTRAINT eventos_tipo_check;
ALTER TABLE eventos ADD CONSTRAINT eventos_tipo_check
  CHECK (tipo IN ('OFICIAL','PERSONAL','INSTITUCIONAL'));

-- ═══ RLS ═══════════════════════════════════════════════════════════
ALTER TABLE evento_participantes ENABLE ROW LEVEL SECURITY;

-- ── evento_participantes: cada usuario gestiona sus propias filas ──
-- Mismo patrón que comunicado_lecturas: admin puede ver el conteo
-- (a efectos de auditoría), insert/delete solo sobre filas propias.
CREATE POLICY participantes_select ON evento_participantes FOR SELECT USING (
  usuario_id = (auth.jwt() ->> 'sub')::uuid
  OR (auth.jwt() ->> 'role') = 'ADMIN'
);

CREATE POLICY participantes_insert ON evento_participantes FOR INSERT WITH CHECK (
  usuario_id = (auth.jwt() ->> 'sub')::uuid
);

CREATE POLICY participantes_delete ON evento_participantes FOR DELETE USING (
  usuario_id = (auth.jwt() ->> 'sub')::uuid
);

-- ── eventos: re-crear políticas con el nuevo tipo ──
DROP POLICY eventos_select  ON eventos;
DROP POLICY eventos_insert  ON eventos;
DROP POLICY eventos_update  ON eventos;
DROP POLICY eventos_delete  ON eventos;

-- SELECT: ADMIN todo; PERSONAL propio; INSTITUCIONAL visible a todos;
-- OFICIAL igual que antes (GLOBAL o por audiencia de decanato).
CREATE POLICY eventos_select ON eventos FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'ADMIN'
  OR tipo = 'INSTITUCIONAL'
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

-- INSERT: INSTITUCIONAL solo ADMIN (global por definición, sin audiencia).
CREATE POLICY eventos_insert ON eventos FOR INSERT WITH CHECK (
  (
    tipo = 'PERSONAL'
    AND (auth.jwt() ->> 'role') IN ('ESTUDIANTE','COMUNICADOR','ADMIN')
    AND usuario_id = (auth.jwt() ->> 'sub')::uuid
  ) OR (
    tipo = 'OFICIAL'
    AND (auth.jwt() ->> 'role') IN ('COMUNICADOR','ADMIN')
  ) OR (
    tipo = 'INSTITUCIONAL'
    AND (auth.jwt() ->> 'role') = 'ADMIN'
  )
);

-- UPDATE/DELETE: solo ADMIN para INSTITUCIONAL (no permiten audiencia).
CREATE POLICY eventos_update ON eventos FOR UPDATE
  USING      (
    (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    OR (tipo = 'OFICIAL' AND (
      (auth.jwt() ->> 'role') = 'ADMIN'
      OR ((auth.jwt() ->> 'role') = 'COMUNICADOR' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    ))
    OR (tipo = 'INSTITUCIONAL' AND (auth.jwt() ->> 'role') = 'ADMIN')
  )
  WITH CHECK (
    (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    OR (tipo = 'OFICIAL' AND (
      (auth.jwt() ->> 'role') = 'ADMIN'
      OR ((auth.jwt() ->> 'role') = 'COMUNICADOR' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    ))
    OR (tipo = 'INSTITUCIONAL' AND (auth.jwt() ->> 'role') = 'ADMIN')
  );

CREATE POLICY eventos_delete ON eventos FOR DELETE USING (
  (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
  OR (tipo = 'OFICIAL' AND (
    (auth.jwt() ->> 'role') = 'ADMIN'
    OR ((auth.jwt() ->> 'role') = 'COMUNICADOR' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
  ))
  OR (tipo = 'INSTITUCIONAL' AND (auth.jwt() ->> 'role') = 'ADMIN')
);
