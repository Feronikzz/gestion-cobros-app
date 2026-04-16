-- Añadir columnas de descripción y enlace a documentos requeridos del catálogo
-- Ejecutar en Supabase SQL Editor

ALTER TABLE catalogo_documentos_requeridos 
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS enlace TEXT;
