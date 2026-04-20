-- Añadir campo carpeta a documentos para organizar archivos por carpetas
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS carpeta text;
