INSERT INTO roles (nombre) VALUES ('ESTUDIANTE'), ('COMUNICADOR'), ('ADMIN');

INSERT INTO decanatos (nombre) VALUES
  ('Estudios Generales'),         -- placeholders: ajustar a los reales de UNIMAR
  ('Humanidades, Artes y Educación'),
  ('Ciencias Económicas y Sociales'),
  ('Ciencias Jurídicas y Políticas'),
  ('Ingeniería y Afines');

-- Los roles no-estudiante se pre-aprovisionan: la API de UNIMAR no conoce
-- los roles de la app; el upsert de login NUNCA sobrescribe el rol.
INSERT INTO usuarios (cedula, nombre, email, rol_id, decanato_id) VALUES
  ('17420667', 'Flavio Rosales (Comunicador)', 'flavio.rosales@unimar.edu.ve',
     (SELECT id FROM roles WHERE nombre = 'COMUNICADOR'), 5),
  ('30065516', 'César García (Admin)', 'cgarcia.5516@unimar.edu.ve',
     (SELECT id FROM roles WHERE nombre = 'ADMIN'), NULL);
