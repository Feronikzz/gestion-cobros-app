-- Add categoria column to procedimientos
ALTER TABLE procedimientos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT NULL;

-- Add documentos_requeridos column (JSONB array) to procedimientos
ALTER TABLE procedimientos ADD COLUMN IF NOT EXISTS documentos_requeridos JSONB DEFAULT NULL;
