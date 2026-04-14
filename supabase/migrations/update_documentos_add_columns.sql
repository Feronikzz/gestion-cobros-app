-- Añadir columnas faltantes a la tabla documentos
-- La tabla ya existe pero necesita estas columnas para la funcionalidad de gestión de archivos

-- Añadir columna cliente_id si no existe
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE;

-- Añadir columna procedimiento_id si no existe
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS procedimiento_id UUID REFERENCES procedimientos(id) ON DELETE CASCADE;

-- Añadir columna archivo_url si no existe
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS archivo_url TEXT DEFAULT NULL;

-- Añadir columna fecha_subida si no existe
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT NOW();
