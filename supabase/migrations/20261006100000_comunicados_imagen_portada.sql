-- Imagen de portada del comunicado.
-- `imagen_path` apunta al objeto en el bucket 'comunicado-adjuntos' (el
-- asset debe estar registrado como adjunto del propio comunicado y ser
-- image/png|jpeg: lo fuerza el caso de uso AsignarPortada). Nullable:
-- los comunicados previos quedan sin portada. PUT/DELETE /portada la
-- asignan/quitan; GET la sirve como URL firmada corta.
ALTER TABLE comunicados ADD COLUMN imagen_path text;
