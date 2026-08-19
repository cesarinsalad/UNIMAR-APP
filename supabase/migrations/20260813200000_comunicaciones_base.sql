-- ═══════════════════════════════════════════════════════════════════
-- Migración: comunicaciones_base
-- Paso 2 — comunicados, audiencias, adjuntos, lecturas + RLS
-- ═══════════════════════════════════════════════════════════════════

-- Tabla principal de comunicados.
-- El ciclo de vida incluye revisión: BORRADOR → PENDIENTE → PUBLICADO → ARCHIVADO.
CREATE TABLE comunicados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          text NOT NULL,
  cuerpo          text NOT NULL,
  autor_id        uuid NOT NULL REFERENCES usuarios(id),
  estado          text NOT NULL DEFAULT 'BORRADOR'
                  CHECK (estado IN ('BORRADOR','PENDIENTE','PUBLICADO','ARCHIVADO')),
  aprobado_por    uuid REFERENCES usuarios(id),       -- trazabilidad: quién aprobó
  motivo_rechazo  text,                               -- visible al autor; se limpia al re-solicitar
  publicado_at    timestamptz,
  programado_para timestamptz,                        -- NULL = visible inmediatamente al aprobar
  expira_at       timestamptz,                        -- NULL = nunca expira
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Audiencias normalizadas.
-- Cuando se seleccionan 0 filas para un comunicado, este es GLOBAL (dirigido a toda la universidad).
-- Cuando se seleccionan 1 o más filas, el comunicado es local (dirigido a los decanatos listados).
CREATE TABLE comunicado_audiencias (
  comunicado_id uuid NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  decanato_id   int  NOT NULL REFERENCES decanatos(id),
  PRIMARY KEY (comunicado_id, decanato_id)
);

-- Metadatos de adjuntos almacenados en Supabase Storage.
-- El BFF genera URLs firmadas; el cliente nunca accede directo al bucket.
CREATE TABLE comunicado_adjuntos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicado_id uuid NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  nombre        text NOT NULL,
  mime_type     text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Confirmación de lectura por estudiante.
-- PK compuesta: un usuario solo registra una lectura por comunicado.
CREATE TABLE comunicado_lecturas (
  comunicado_id uuid NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  usuario_id    uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  leido_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comunicado_id, usuario_id)
);

-- Índices para las consultas más frecuentes y para que las políticas RLS
-- (especialmente los EXISTS sobre audiencias) sean eficientes.
CREATE INDEX idx_comunicados_visibles  ON comunicados (estado, programado_para);
CREATE INDEX idx_audiencias_decanato   ON comunicado_audiencias (decanato_id);
CREATE INDEX idx_lecturas_comunicado   ON comunicado_lecturas (comunicado_id);

-- Actualización automática de updated_at en comunicados.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comunicados_updated_at
  BEFORE UPDATE ON comunicados
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE
  ON comunicados, comunicado_audiencias, comunicado_adjuntos, comunicado_lecturas
  TO app_bff;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_bff;

-- ═══ RLS ═══════════════════════════════════════════════════════════
ALTER TABLE comunicados            ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicado_audiencias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicado_adjuntos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicado_lecturas    ENABLE ROW LEVEL SECURITY;

-- ── comunicados: lectura ──
-- ADMIN ve todo; autor ve lo suyo en cualquier estado; el resto solo ve
-- PUBLICADO dentro de la ventana de visibilidad y en su audiencia (o GLOBAL).
CREATE POLICY comunicados_select ON comunicados FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'ADMIN'
  OR autor_id = (auth.jwt() ->> 'sub')::uuid
  OR (
    estado = 'PUBLICADO'
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

-- ── comunicados: escritura ──
-- Solo COMUNICADOR o ADMIN pueden crear; el autor_id debe coincidir con el
-- usuario autenticado. UPDATE solo para autor o ADMIN.
CREATE POLICY comunicados_insert ON comunicados FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role') IN ('COMUNICADOR','ADMIN')
  AND autor_id = (auth.jwt() ->> 'sub')::uuid
);

CREATE POLICY comunicados_update ON comunicados FOR UPDATE
  USING      ((auth.jwt() ->> 'role') = 'ADMIN' OR autor_id = (auth.jwt() ->> 'sub')::uuid)
  WITH CHECK ((auth.jwt() ->> 'role') = 'ADMIN' OR autor_id = (auth.jwt() ->> 'sub')::uuid);

-- No creamos política de DELETE: no se permite borrar comunicados.
-- El retiro se hace mediante el estado ARCHIVADO (fail-closed).

-- ── audiencias: lectura y escritura ──
-- SELECT permisivo a propósito: las audiencias son metadato no sensible; el
-- activo protegido es el comunicado. La política anterior necesita leer esta
-- tabla para evaluar el EXISTS. El BFF nunca expone audiencias de forma
-- independiente a un comunicado.
CREATE POLICY audiencias_select ON comunicado_audiencias
  FOR SELECT TO app_bff USING (true);

-- INSERT: AQUÍ se aplica el ABAC de escritura. Un COMUNICADOR físicamente no
-- puede insertar una audiencia que no sea su propio decanato. ADMIN sin límite.
CREATE POLICY audiencias_insert ON comunicado_audiencias FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role') = 'ADMIN'
  OR decanato_id = (auth.jwt() ->> 'decanato_id')::int
);

CREATE POLICY audiencias_delete ON comunicado_audiencias FOR DELETE USING (
  (auth.jwt() ->> 'role') = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM comunicados c
    WHERE c.id = comunicado_id
      AND c.autor_id = (auth.jwt() ->> 'sub')::uuid
  )
);

-- ── adjuntos ──
-- Visible si el comunicado padre es visible (la subconsulta hereda la RLS de
-- comunicados). Insertar solo autor o ADMIN.
CREATE POLICY adjuntos_select ON comunicado_adjuntos FOR SELECT USING (
  EXISTS (SELECT 1 FROM comunicados c WHERE c.id = comunicado_id)
);

CREATE POLICY adjuntos_insert ON comunicado_adjuntos FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role') = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM comunicados c
    WHERE c.id = comunicado_id
      AND c.autor_id = (auth.jwt() ->> 'sub')::uuid
  )
);

-- ── lecturas ──
-- Cada usuario inserta las suyas. Autor/ADMIN pueden leer el conteo.
CREATE POLICY lecturas_select ON comunicado_lecturas FOR SELECT USING (
  usuario_id = (auth.jwt() ->> 'sub')::uuid
  OR (auth.jwt() ->> 'role') = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM comunicados c
    WHERE c.id = comunicado_id
      AND c.autor_id = (auth.jwt() ->> 'sub')::uuid
  )
);

CREATE POLICY lecturas_insert ON comunicado_lecturas FOR INSERT
  WITH CHECK (usuario_id = (auth.jwt() ->> 'sub')::uuid);
