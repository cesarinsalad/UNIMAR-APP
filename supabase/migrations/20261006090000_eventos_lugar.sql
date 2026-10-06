-- Evento.lugar: ubicación opcional (aula, sala, edificio) para eventos
-- OFICIALES y PERSONALES. Nullable: los eventos previos quedan sin lugar.
ALTER TABLE eventos ADD COLUMN lugar text;
