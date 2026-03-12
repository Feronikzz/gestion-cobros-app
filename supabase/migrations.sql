-- =============================================================================
-- MIGRACIONES ESENCIALES - Ejecutar en Supabase SQL Editor
-- =============================================================================

-- Migración: añadir campos IRPF a facturas si no existen
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='incluir_iva') THEN
        ALTER TABLE public.facturas ADD COLUMN incluir_iva boolean NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='incluir_irpf') THEN
        ALTER TABLE public.facturas ADD COLUMN incluir_irpf boolean NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='irpf_porcentaje') THEN
        ALTER TABLE public.facturas ADD COLUMN irpf_porcentaje numeric(5,2) NOT NULL DEFAULT 15;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='irpf_importe') THEN
        ALTER TABLE public.facturas ADD COLUMN irpf_importe numeric(12,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Migración: añadir campos IVA a cobros si no existen
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cobros' AND column_name='iva_incluido') THEN
        ALTER TABLE public.cobros ADD COLUMN iva_incluido boolean NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cobros' AND column_name='iva_porcentaje') THEN
        ALTER TABLE public.cobros ADD COLUMN iva_porcentaje numeric(5,2) NOT NULL DEFAULT 21;
    END IF;
END $$;

-- Verificar que las columnas existen en facturas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'facturas' 
    AND column_name IN ('incluir_iva', 'incluir_irpf', 'irpf_porcentaje', 'irpf_importe')
ORDER BY column_name;

-- Verificar que las columnas existen en cobros
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cobros' 
    AND column_name IN ('iva_incluido', 'iva_porcentaje')
ORDER BY column_name;
