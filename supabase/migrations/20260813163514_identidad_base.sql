-- Rol de DB dedicado del BFF (SIN bypass de RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_bff') THEN
    CREATE ROLE app_bff LOGIN PASSWORD 'app_bff_dev_password';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_bff;

CREATE TABLE roles (
  id     int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL UNIQUE
);

CREATE TABLE decanatos (
  id     int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL UNIQUE
);

CREATE TABLE usuarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula      text NOT NULL UNIQUE,     -- cédula: llave de mapeo con la API de UNIMAR
  nombre      text NOT NULL,
  email       text,
  rol_id      int  NOT NULL REFERENCES roles(id),
  decanato_id int  REFERENCES decanatos(id), -- NULL permitido (ADMIN)
  preferencias jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dispositivos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  push_token    text NOT NULL UNIQUE,
  plataforma    text NOT NULL CHECK (plataforma IN ('android','ios','web')),
  registrado_at timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON roles, decanatos, usuarios, dispositivos TO app_bff;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_bff;

ALTER TABLE roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE decanatos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispositivos ENABLE ROW LEVEL SECURITY;

-- Tablas de sistema: solo el BFF (rol app_bff) las gestiona
CREATE POLICY roles_app_bff     ON roles     TO app_bff USING (true) WITH CHECK (true);
CREATE POLICY decanatos_app_bff ON decanatos TO app_bff USING (true) WITH CHECK (true);
CREATE POLICY usuarios_app_bff  ON usuarios  TO app_bff USING (true) WITH CHECK (true);

-- Dispositivos: ABAC por claim — cada usuario solo toca los suyos.
-- Sin claims, auth.jwt() es NULL → comparación falsa → fail-closed.
CREATE POLICY dispositivos_propios_select ON dispositivos
  FOR SELECT USING (usuario_id = (auth.jwt() ->> 'sub')::uuid);
CREATE POLICY dispositivos_propios_insert ON dispositivos
  FOR INSERT WITH CHECK (usuario_id = (auth.jwt() ->> 'sub')::uuid);
CREATE POLICY dispositivos_propios_update ON dispositivos
  FOR UPDATE  USING (usuario_id = (auth.jwt() ->> 'sub')::uuid)
          WITH CHECK (usuario_id = (auth.jwt() ->> 'sub')::uuid);
CREATE POLICY dispositivos_propios_delete ON dispositivos
  FOR DELETE USING (usuario_id = (auth.jwt() ->> 'sub')::uuid);