-- Categoría editorial del comunicado y pie de su imagen de portada.
-- - categoria: nullable (comunicados sin categoría siguen sin chips en el
--   feed); CHECK de los tres valores del Figma.
-- - imagen_pie: caption opcional (≤200 chars) que se asigna junto a la
--   portada en PUT /:id/portada (body pie?); DELETE la limpia con la ruta.
ALTER TABLE comunicados
  ADD COLUMN categoria text CHECK (categoria IN ('ACADEMICO', 'EVENTO', 'INSTITUCIONAL')),
  ADD COLUMN imagen_pie text;
