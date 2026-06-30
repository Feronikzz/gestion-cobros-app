-- Add cobro_id field to facturas table
-- This allows tracking which cobro a factura was generated from

ALTER TABLE facturas 
ADD COLUMN cobro_id UUID;

-- Add foreign key constraint to cobros table
ALTER TABLE facturas 
ADD CONSTRAINT fk_facturas_cobros 
FOREIGN KEY (cobro_id) REFERENCES cobros(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_facturas_cobro_id ON facturas(cobro_id);

-- Add comment to explain the field
COMMENT ON COLUMN facturas.cobro_id IS 'ID del cobro desde el cual se generó esta factura. Permite evitar facturar el mismo cobro dos veces y calcular estadísticas de cobrado vs facturado.';
