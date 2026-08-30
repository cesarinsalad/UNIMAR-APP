-- ═══════════════════════════════════════════════════════════════════
-- Migración: calendario_base
-- Paso 4 — eventos oficiales y personales + audiencias + recordatorios
-- ═══════════════════════════════════════════════════════════════════

-- Tabla principal de eventos del calendario.
--
-- Nota de diseño: `usuario_id` es SIEMPRE NOT NULL. Representa al
-- "propietario/creador" del evento:
--   * PERSONAL → es el usuario dueño.
--   * OFICIAL  → es el ADMIN o COMUNICADOR que lo creó.
-- Esto difiere del diseño original (ARCHITECTURE.md §4 mencionaba NULL si
-- OFICIAL). El cambio se hizo para que un COMUNICADOR pueda editar/eliminar
-- los eventos oficiales que él mismo creó, simplificando RLS y manteniendo
-- un único campo de trazabilidad por evento.
CREATE TABLE eventos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo               text NOT NULL,
  descripcion          text,
  tipo                 text NOT NULL CHECK (tipo IN ('OFICIAL','PERSONAL')),
  usuario_id           uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  inicio_at            timestamptz NOT NULL,
  fin_at               timestamptz,
  dia_completo         boolean NOT NULL DEFAULT false,
  recordatorio_minutos int CHECK (recordatorio_minutos IS NULL OR recordatorio_minutos >= 0),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Audiencias normalizadas para eventos OFICIALES.
-- Mismo patrón que comunicado_audiencias: 0 filas = GLOBAL, N filas = local.
CREATE TABLE evento_audiencias (
  evento_id   uuid NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  decanato_id int  NOT NULL REFERENCES decanatos(id),
  PRIMARY KEY (evento_id, decanato_id)
);

-- Registro de recordatorios ya enviados.
-- PK compuesta (evento, usuario): garantiza idempotencia — un destinatario
-- recibe a lo sumo un recordatorio por evento. Solo el job del sistema
-- escribe aquí (uow.run, sin claims).
CREATE TABLE evento_recordatorios_enviados (
  evento_id   uuid NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  enviado_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, usuario_id)
);

-- Índices para las consultas más frecuentes.
-- Listar por rango de fechas (operación principal) y resolver destinatarios
-- del job de recordatorios.
CREATE INDEX idx_eventos_inicio         ON eventos (inicio_at);
CREATE INDEX idx_eventos_tipo_usuario   ON eventos (tipo, usuario_id);
CREATE INDEX idx_audiencias_evento      ON evento_audiencias (evento_id);
CREATE INDEX idx_audiencias_evento_decanato ON evento_audiencias (decanato_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON eventos, evento_audiencias TO app_bff;
GRANT SELECT, INSERT, UPDATE, DELETE ON evento_recordatorios_enviados TO app_bff;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_bff;

-- ═══ RLS ═══════════════════════════════════════════════════════════
ALTER TABLE eventos                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_audiencias             ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_recordatorios_enviados ENABLE ROW LEVEL SECURITY;

-- ── eventos: SELECT (bajo claims de usuario) ──
-- ADMIN ve todo. PERSONAL: solo el propio. OFICIAL: GLOBAL o audiencia por
-- decanato del claim.
CREATE POLICY eventos_select ON eventos FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'ADMIN'
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

-- Política paralela para SELECT en modo sistema (sin claims): el job de
-- recordatorios debe poder escanear TODOS los eventos. Bajo claims sigue
-- aplicando `eventos_select` (más restrictiva).
CREATE POLICY eventos_select_sistema ON eventos
  FOR SELECT TO app_bff
  USING (current_setting('request.jwt.claims', true) IS NULL);

-- ── eventos: INSERT ──
-- PERSONAL: usuario_id debe ser el del claim (cualquier rol autenticado).
-- OFICIAL: solo ADMIN o COMUNICADOR. La regla anti-global (COMUNICADOR solo
-- su decanato) se enforce en el caso de uso y se revalida en la política
-- de evento_audiencias (no se permite audiencia ajena).
CREATE POLICY eventos_insert ON eventos FOR INSERT WITH CHECK (
  (
    tipo = 'PERSONAL'
    AND (auth.jwt() ->> 'role') IN ('ESTUDIANTE','COMUNICADOR','ADMIN')
    AND usuario_id = (auth.jwt() ->> 'sub')::uuid
  ) OR (
    tipo = 'OFICIAL'
    AND (auth.jwt() ->> 'role') IN ('COMUNICADOR','ADMIN')
  )
);

-- ── eventos: UPDATE ──
-- PERSONAL: solo el dueño. OFICIAL: ADMIN, o COMUNICADOR dueño del evento.
CREATE POLICY eventos_update ON eventos FOR UPDATE
  USING      (
    (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    OR (tipo = 'OFICIAL' AND (
      (auth.jwt() ->> 'role') = 'ADMIN'
      OR ((auth.jwt() ->> 'role') = 'COMUNICADOR' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    ))
  )
  WITH CHECK (
    (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    OR (tipo = 'OFICIAL' AND (
      (auth.jwt() ->> 'role') = 'ADMIN'
      OR ((auth.jwt() ->> 'role') = 'COMUNICADOR' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
    ))
  );

-- ── eventos: DELETE ──
-- Mismas reglas que UPDATE.
CREATE POLICY eventos_delete ON eventos FOR DELETE USING (
  (tipo = 'PERSONAL' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
  OR (tipo = 'OFICIAL' AND (
    (auth.jwt() ->> 'role') = 'ADMIN'
    OR ((auth.jwt() ->> 'role') = 'COMUNICADOR' AND usuario_id = (auth.jwt() ->> 'sub')::uuid)
  ))
);

-- ── evento_audiencias: SELECT permisivo ──
-- Las audiencias son metadato no sensible; el activo protegido es el evento.
CREATE POLICY evento_audiencias_select ON evento_audiencias
  FOR SELECT TO app_bff USING (true);

-- ── evento_audiencias: INSERT ──
-- ADMIN sin límite; COMUNICADOR solo su propio decanato (mismo ABAC que comunicados).
CREATE POLICY evento_audiencias_insert ON evento_audiencias FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role') = 'ADMIN'
  OR decanato_id = (auth.jwt() ->> 'decanato_id')::int
);

-- ── evento_audiencias: DELETE ──
-- Solo ADMIN (no se permite que el COMUNICADOR retire la audiencia de un
-- evento oficial: la edición completa del evento ya cubre el caso).
CREATE POLICY evento_audiencias_delete ON evento_audiencias FOR DELETE USING (
  (auth.jwt() ->> 'role') = 'ADMIN'
);

-- ── evento_recordatorios_enviados: solo sistema ──
-- Esta tabla la escribe únicamente el job de recordatorios (uow.run, sin
-- claims). Bajo claims de usuario, RLS debe denegar SELECT/INSERT/
-- UPDATE/DELETE (fail-closed). La política explícita documenta la
-- intención: cuando request.jwt.claims es NULL (modo sistema), todas las
-- operaciones pasan; cuando hay claims, USING/WITH CHECK es NULL y la
-- operación se deniega.
CREATE POLICY evento_recordatorios_sistema ON evento_recordatorios_enviados
  FOR ALL TO app_bff
  USING      (current_setting('request.jwt.claims', true) IS NULL)
  WITH CHECK (current_setting('request.jwt.claims', true) IS NULL);
