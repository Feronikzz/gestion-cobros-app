-- =============================================================================
-- SCHEMA COMPLETO - Gestión de Cobros App
-- Ejecutar en Supabase SQL Editor
-- Usa IF NOT EXISTS para evitar errores al re-ejecutar
-- =============================================================================

-- RESET COMPLETO (descomenta si necesitas empezar de cero)
-- DROP TABLE IF EXISTS public.gastos CASCADE;
-- DROP TABLE IF EXISTS public.cierres_mensuales CASCADE;
-- DROP TABLE IF EXISTS public.cobros CASCADE;
-- DROP TABLE IF EXISTS public.procedimientos CASCADE;
-- DROP TABLE IF EXISTS public.repartos CASCADE;
-- DROP TABLE IF EXISTS public.clientes CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Clientes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    nif text,
    telefono text,
    email text,
    direccion text,
    anio_nacimiento integer,
    fecha_entrada date NOT NULL,
    documento_tipo text,
    documento_caducidad date,
    estado text DEFAULT 'activo' CHECK (estado IN ('activo', 'pendiente', 'pagado', 'archivado')),
    notas text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Migración: añadir columnas nuevas si la tabla ya existía
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='nif') THEN
        ALTER TABLE public.clientes ADD COLUMN nif text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='telefono') THEN
        ALTER TABLE public.clientes ADD COLUMN telefono text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='email') THEN
        ALTER TABLE public.clientes ADD COLUMN email text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='direccion') THEN
        ALTER TABLE public.clientes ADD COLUMN direccion text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='anio_nacimiento') THEN
        ALTER TABLE public.clientes ADD COLUMN anio_nacimiento integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='documento_tipo') THEN
        ALTER TABLE public.clientes ADD COLUMN documento_tipo text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='documento_caducidad') THEN
        ALTER TABLE public.clientes ADD COLUMN documento_caducidad date;
    END IF;
END $$;

-- ─── Procedimientos / Expedientes ──────────────────────────
CREATE TABLE IF NOT EXISTS public.procedimientos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    titulo text NOT NULL,
    concepto text NOT NULL,
    presupuesto numeric(12,2) NOT NULL DEFAULT 0,
    tiene_entrada boolean NOT NULL DEFAULT false,
    importe_entrada numeric(12,2) NOT NULL DEFAULT 0,
    nie_interesado text,
    nombre_interesado text,
    expediente_referencia text,
    fecha_presentacion date,
    fecha_resolucion date,
    estado text DEFAULT 'pendiente_presentar' CHECK (estado IN (
        'pendiente', 'pendiente_presentar', 'presentado', 'pendiente_resolucion',
        'pendiente_recurso', 'resuelto', 'cerrado', 'archivado'
    )),
    notas text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Migración: actualizar procedimientos si la tabla ya existía con esquema viejo
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procedimientos' AND column_name='nie_interesado') THEN
        ALTER TABLE public.procedimientos ADD COLUMN nie_interesado text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procedimientos' AND column_name='nombre_interesado') THEN
        ALTER TABLE public.procedimientos ADD COLUMN nombre_interesado text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procedimientos' AND column_name='fecha_presentacion') THEN
        ALTER TABLE public.procedimientos ADD COLUMN fecha_presentacion date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procedimientos' AND column_name='fecha_resolucion') THEN
        ALTER TABLE public.procedimientos ADD COLUMN fecha_resolucion date;
    END IF;
    -- Migrar estados viejos a nuevos
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procedimientos' AND column_name='expediente_presentado') THEN
        ALTER TABLE public.procedimientos DROP COLUMN IF EXISTS expediente_presentado;
    END IF;
    -- Actualizar constraint de estado si existe
    ALTER TABLE public.procedimientos DROP CONSTRAINT IF EXISTS procedimientos_estado_check;
    ALTER TABLE public.procedimientos ADD CONSTRAINT procedimientos_estado_check
        CHECK (estado IN ('pendiente_presentar', 'presentado', 'pendiente_resolucion', 'pendiente_recurso', 'resuelto', 'cerrado', 'archivado'));
    -- Migrar valores viejos
    UPDATE public.procedimientos SET estado = 'pendiente_presentar' WHERE estado = 'activo';
    UPDATE public.procedimientos SET estado = 'pendiente_resolucion' WHERE estado = 'pendiente';
END $$;

-- ─── Cobros ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cobros (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    procedimiento_id uuid REFERENCES public.procedimientos(id) ON DELETE SET NULL,
    fecha_cobro date NOT NULL,
    importe numeric(12,2) NOT NULL,
    metodo_pago text CHECK (metodo_pago IN ('transferencia', 'efectivo', 'tarjeta', 'bizum', 'cheque', 'otro')),
    notas text,
    iva_tipo text NOT NULL DEFAULT 'sin_iva' CHECK (iva_tipo IN ('sin_iva', 'iva_incluido', 'iva_sobre_precio')),
    iva_porcentaje numeric(5,2) NOT NULL DEFAULT 21,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Migración: añadir campos a cobros si no existen
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cobros' AND column_name='procedimiento_id') THEN
        ALTER TABLE public.cobros ADD COLUMN procedimiento_id uuid REFERENCES public.procedimientos(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cobros' AND column_name='iva_tipo') THEN
        ALTER TABLE public.cobros ADD COLUMN iva_tipo text NOT NULL DEFAULT 'sin_iva' CHECK (iva_tipo IN ('sin_iva', 'iva_incluido', 'iva_sobre_precio'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cobros' AND column_name='iva_porcentaje') THEN
        ALTER TABLE public.cobros ADD COLUMN iva_porcentaje numeric(5,2) NOT NULL DEFAULT 21;
    END IF;
END $$;

-- Tabla de repartos (solo si no existe)
CREATE TABLE IF NOT EXISTS public.repartos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    mes text NOT NULL, -- Formato: 'YYYY-MM'
    categoria text CHECK (categoria IN ('Sueldos', 'Alquiler', 'Suministros', 'Material', 'Servicios', 'Impuestos', 'Marketing', 'Transporte', 'Otros')),
    destinatario text NOT NULL,
    concepto text NOT NULL,
    importe numeric(12,2) NOT NULL,
    notas text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla de gastos mensuales (solo si no existe)
CREATE TABLE IF NOT EXISTS public.gastos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    mes text NOT NULL, -- Formato: 'YYYY-MM'
    categoria text CHECK (categoria IN ('Suministros', 'Alquiler', 'Material', 'Servicios', 'Impuestos', 'Marketing', 'Transporte', 'Otros')),
    proveedor text NOT NULL,
    conceptos text[] NOT NULL, -- Array de conceptos del gasto
    importe_total numeric(12,2) NOT NULL,
    factura_url text, -- URL del archivo de factura subido
    numero_factura text,
    fecha_factura date,
    notas text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla de cierres mensuales (solo si no existe)
CREATE TABLE IF NOT EXISTS public.cierres_mensuales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mes text NOT NULL UNIQUE, -- Formato: 'YYYY-MM'
    arrastre_anterior numeric(12,2) NOT NULL DEFAULT 0,
    cobrado_mes numeric(12,2) NOT NULL DEFAULT 0,
    repartido_mes numeric(12,2) NOT NULL DEFAULT 0,
    saldo_final numeric(12,2) NOT NULL DEFAULT 0,
    estado text DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Documentos adjuntos a procedimientos ────────────────────
CREATE TABLE IF NOT EXISTS public.documentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    procedimiento_id uuid NOT NULL REFERENCES public.procedimientos(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('justificante', 'notificacion', 'recurso', 'resolucion', 'otro')),
    archivo_url text,
    notas text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Datos emisor (config facturación) ────────────────────────
CREATE TABLE IF NOT EXISTS public.datos_emisor (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    nif_cif text NOT NULL,
    direccion text,
    telefono text,
    email text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Facturas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.facturas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numero text NOT NULL,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    procedimiento_id uuid REFERENCES public.procedimientos(id) ON DELETE SET NULL,
    tipo text NOT NULL CHECK (tipo IN ('normal', 'rectificativa', 'no_contable')),
    fecha date NOT NULL,
    emisor_nombre text NOT NULL,
    emisor_nif text NOT NULL,
    emisor_direccion text,
    receptor_nombre text NOT NULL,
    receptor_nif text,
    receptor_direccion text,
    lineas jsonb NOT NULL DEFAULT '[]',
    base_imponible numeric(12,2) NOT NULL DEFAULT 0,
    incluir_iva boolean NOT NULL DEFAULT true,
    iva_porcentaje numeric(5,2) NOT NULL DEFAULT 21,
    iva_importe numeric(12,2) NOT NULL DEFAULT 0,
    incluir_irpf boolean NOT NULL DEFAULT false,
    irpf_porcentaje numeric(5,2) NOT NULL DEFAULT 15,
    irpf_importe numeric(12,2) NOT NULL DEFAULT 0,
    total numeric(12,2) NOT NULL DEFAULT 0,
    factura_rectificada_id uuid REFERENCES public.facturas(id) ON DELETE SET NULL,
    motivo_rectificacion text,
    notas text,
    created_at timestamptz NOT NULL DEFAULT now()
);

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

-- ─── Cliente Notas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cliente_notas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    nota text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datos_emisor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_notas ENABLE ROW LEVEL SECURITY;

-- Crear políticas solo si no existen (manejo seguro)
DO $$
BEGIN
    -- Políticas para clientes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'clientes_select_own') THEN
        CREATE POLICY "clientes_select_own" ON public.clientes FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'clientes_insert_own') THEN
        CREATE POLICY "clientes_insert_own" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'clientes_update_own') THEN
        CREATE POLICY "clientes_update_own" ON public.clientes FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'clientes_delete_own') THEN
        CREATE POLICY "clientes_delete_own" ON public.clientes FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Políticas para procedimientos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedimientos' AND policyname = 'procedimientos_select_own') THEN
        CREATE POLICY "procedimientos_select_own" ON public.procedimientos FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedimientos' AND policyname = 'procedimientos_insert_own') THEN
        CREATE POLICY "procedimientos_insert_own" ON public.procedimientos FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedimientos' AND policyname = 'procedimientos_update_own') THEN
        CREATE POLICY "procedimientos_update_own" ON public.procedimientos FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedimientos' AND policyname = 'procedimientos_delete_own') THEN
        CREATE POLICY "procedimientos_delete_own" ON public.procedimientos FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Políticas para cobros
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cobros' AND policyname = 'cobros_select_own') THEN
        CREATE POLICY "cobros_select_own" ON public.cobros FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cobros' AND policyname = 'cobros_insert_own') THEN
        CREATE POLICY "cobros_insert_own" ON public.cobros FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cobros' AND policyname = 'cobros_update_own') THEN
        CREATE POLICY "cobros_update_own" ON public.cobros FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cobros' AND policyname = 'cobros_delete_own') THEN
        CREATE POLICY "cobros_delete_own" ON public.cobros FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Políticas para repartos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repartos' AND policyname = 'repartos_select_own') THEN
        CREATE POLICY "repartos_select_own" ON public.repartos FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repartos' AND policyname = 'repartos_insert_own') THEN
        CREATE POLICY "repartos_insert_own" ON public.repartos FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repartos' AND policyname = 'repartos_update_own') THEN
        CREATE POLICY "repartos_update_own" ON public.repartos FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'repartos' AND policyname = 'repartos_delete_own') THEN
        CREATE POLICY "repartos_delete_own" ON public.repartos FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Políticas para gastos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gastos' AND policyname = 'gastos_select_own') THEN
        CREATE POLICY "gastos_select_own" ON public.gastos FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gastos' AND policyname = 'gastos_insert_own') THEN
        CREATE POLICY "gastos_insert_own" ON public.gastos FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gastos' AND policyname = 'gastos_update_own') THEN
        CREATE POLICY "gastos_update_own" ON public.gastos FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gastos' AND policyname = 'gastos_delete_own') THEN
        CREATE POLICY "gastos_delete_own" ON public.gastos FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Políticas para cierres mensuales
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cierres_mensuales' AND policyname = 'cierres_select_own') THEN
        CREATE POLICY "cierres_select_own" ON public.cierres_mensuales FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cierres_mensuales' AND policyname = 'cierres_insert_own') THEN
        CREATE POLICY "cierres_insert_own" ON public.cierres_mensuales FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cierres_mensuales' AND policyname = 'cierres_update_own') THEN
        CREATE POLICY "cierres_update_own" ON public.cierres_mensuales FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cierres_mensuales' AND policyname = 'cierres_delete_own') THEN
        CREATE POLICY "cierres_delete_own" ON public.cierres_mensuales FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Políticas para documentos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos' AND policyname = 'documentos_select_own') THEN
        CREATE POLICY "documentos_select_own" ON public.documentos FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos' AND policyname = 'documentos_insert_own') THEN
        CREATE POLICY "documentos_insert_own" ON public.documentos FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos' AND policyname = 'documentos_update_own') THEN
        CREATE POLICY "documentos_update_own" ON public.documentos FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos' AND policyname = 'documentos_delete_own') THEN
        CREATE POLICY "documentos_delete_own" ON public.documentos FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Políticas para datos_emisor
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'datos_emisor' AND policyname = 'datos_emisor_select_own') THEN
        CREATE POLICY "datos_emisor_select_own" ON public.datos_emisor FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'datos_emisor' AND policyname = 'datos_emisor_insert_own') THEN
        CREATE POLICY "datos_emisor_insert_own" ON public.datos_emisor FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'datos_emisor' AND policyname = 'datos_emisor_update_own') THEN
        CREATE POLICY "datos_emisor_update_own" ON public.datos_emisor FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'datos_emisor' AND policyname = 'datos_emisor_delete_own') THEN
        CREATE POLICY "datos_emisor_delete_own" ON public.datos_emisor FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Políticas para facturas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'facturas' AND policyname = 'facturas_select_own') THEN
        CREATE POLICY "facturas_select_own" ON public.facturas FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'facturas' AND policyname = 'facturas_insert_own') THEN
        CREATE POLICY "facturas_insert_own" ON public.facturas FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'facturas' AND policyname = 'facturas_update_own') THEN
        CREATE POLICY "facturas_update_own" ON public.facturas FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'facturas' AND policyname = 'facturas_delete_own') THEN
        CREATE POLICY "facturas_delete_own" ON public.facturas FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Políticas para cliente_notas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_notas' AND policyname = 'cliente_notas_select_own') THEN
        CREATE POLICY "cliente_notas_select_own" ON public.cliente_notas FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_notas' AND policyname = 'cliente_notas_insert_own') THEN
        CREATE POLICY "cliente_notas_insert_own" ON public.cliente_notas FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_notas' AND policyname = 'cliente_notas_update_own') THEN
        CREATE POLICY "cliente_notas_update_own" ON public.cliente_notas FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_notas' AND policyname = 'cliente_notas_delete_own') THEN
        CREATE POLICY "cliente_notas_delete_own" ON public.cliente_notas FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);
CREATE INDEX IF NOT EXISTS idx_procedimientos_user_id ON public.procedimientos(user_id);
CREATE INDEX IF NOT EXISTS idx_procedimientos_cliente_id ON public.procedimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_procedimientos_estado ON public.procedimientos(estado);
CREATE INDEX IF NOT EXISTS idx_cobros_user_id ON public.cobros(user_id);
CREATE INDEX IF NOT EXISTS idx_cobros_cliente_id ON public.cobros(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cobros_procedimiento_id ON public.cobros(procedimiento_id);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha_cobro ON public.cobros(fecha_cobro);
CREATE INDEX IF NOT EXISTS idx_documentos_user_id ON public.documentos(user_id);
CREATE INDEX IF NOT EXISTS idx_documentos_procedimiento_id ON public.documentos(procedimiento_id);
CREATE INDEX IF NOT EXISTS idx_repartos_user_id ON public.repartos(user_id);
CREATE INDEX IF NOT EXISTS idx_repartos_mes ON public.repartos(mes);
CREATE INDEX IF NOT EXISTS idx_gastos_user_id ON public.gastos(user_id);
CREATE INDEX IF NOT EXISTS idx_gastos_mes ON public.gastos(mes);
CREATE INDEX IF NOT EXISTS idx_cierres_user_id ON public.cierres_mensuales(user_id);
CREATE INDEX IF NOT EXISTS idx_cierres_mes ON public.cierres_mensuales(mes);
CREATE INDEX IF NOT EXISTS idx_datos_emisor_user_id ON public.datos_emisor(user_id);
CREATE INDEX IF NOT EXISTS idx_facturas_user_id ON public.facturas(user_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id ON public.facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON public.facturas(fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON public.facturas(numero);
CREATE INDEX IF NOT EXISTS idx_cliente_notas_user_id ON public.cliente_notas(user_id);
CREATE INDEX IF NOT EXISTS idx_cliente_notas_cliente_id ON public.cliente_notas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_notas_created_at ON public.cliente_notas(created_at DESC);

-- Verificación
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('clientes', 'procedimientos', 'cobros', 'documentos', 'repartos', 'gastos', 'datos_emisor', 'facturas', 'cierres_mensuales')
ORDER BY table_name;
