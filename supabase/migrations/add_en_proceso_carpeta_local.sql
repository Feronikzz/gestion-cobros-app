-- Add 'en_proceso' to procedimientos.estado enum constraint (if using check constraint)
-- If your estado column is TEXT without constraint, no change needed.
-- Otherwise run the appropriate ALTER for your DB setup.

-- Add carpeta_local column to clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS carpeta_local TEXT DEFAULT NULL;
