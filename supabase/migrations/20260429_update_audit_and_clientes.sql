
-- Migration: 20260429_update_audit_and_clientes.sql
-- Description: Add cliente_id to audit_log for grouping, and designation fields to clientes for persistence.

-- 1. Update audit_log table
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS cliente_id UUID;
CREATE INDEX IF NOT EXISTS idx_audit_cliente_id ON audit_log(cliente_id);

-- 2. Update clientes table with designation fields
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS designacion_lugar TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS designacion_dia TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS designacion_mes TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS designacion_anio TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS designacion_solicitud TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS designacion_consentimiento_dehu BOOLEAN DEFAULT FALSE;

-- 3. Comment for clarity
COMMENT ON COLUMN audit_log.cliente_id IS 'ID del cliente relacionado para agrupar acciones en el historial.';
COMMENT ON COLUMN clientes.designacion_lugar IS 'Lugar de firma de la última designación de representante.';
COMMENT ON COLUMN clientes.designacion_dia IS 'Día de firma de la última designación de representante.';
COMMENT ON COLUMN clientes.designacion_mes IS 'Mes de firma de la última designación de representante.';
COMMENT ON COLUMN clientes.designacion_anio IS 'Año de firma de la última designación de representante.';
COMMENT ON COLUMN clientes.designacion_solicitud IS 'Última solicitud/procedimiento indicada en la designación.';
COMMENT ON COLUMN clientes.designacion_consentimiento_dehu IS 'Si el cliente consintió el uso de DEHú en la última designación.';
