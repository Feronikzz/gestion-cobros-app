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

-- Actualizar el CHECK constraint de tipos para permitir más formatos
ALTER TABLE documentos DROP CONSTRAINT IF EXISTS documentos_tipo_check;
ALTER TABLE documentos ADD CONSTRAINT documentos_tipo_check 
CHECK (tipo IN ('DNI', 'NIE', 'PASAPORTE', 'PDF', 'JPG', 'JPEG', 'PNG', 'GIF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'TXT', 'ZIP', 'RAR', 'OTRO'));
