-- Add numero_inicial field to datos_emisor table
-- This allows configuring the starting point for invoice numbering

ALTER TABLE datos_emisor 
ADD COLUMN numero_inicial INTEGER DEFAULT 1;

-- Add comment to explain the field
COMMENT ON COLUMN datos_emisor.numero_inicial IS 'Punto de partida para numeración de facturas. Si es 1, las facturas empezarán en FAC-2026/0001. Si es 50, empezarán en FAC-2026/0050.';
