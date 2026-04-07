-- ==============================================================================
-- MIGRACIÓN V2: Nuevos campos cliente + Actividades CRM + Recibís + Docs ID
-- ==============================================================================

-- 1. Nuevas columnas en clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS apellidos TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono2 TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_postal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS localidad TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS provincia TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nacionalidad TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS documento_numero TEXT;

-- 2. Tabla documentos_identidad (múltiples docs por cliente)
CREATE TABLE IF NOT EXISTS documentos_identidad (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('DNI', 'NIE', 'NIF', 'Pasaporte', 'CIF', 'Otro')),
  numero TEXT NOT NULL,
  fecha_expedicion DATE,
  fecha_caducidad DATE,
  es_principal BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_identidad_cliente ON documentos_identidad(cliente_id);
ALTER TABLE documentos_identidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own docs_identidad" ON documentos_identidad
  FOR ALL USING (auth.uid() = user_id);

-- 3. Tabla actividades (CRM)
CREATE TABLE IF NOT EXISTS actividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  procedimiento_id UUID REFERENCES procedimientos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'llamada_entrante', 'llamada_saliente',
    'email_enviado', 'email_recibido',
    'visita', 'reunion', 'tarea', 'nota',
    'whatsapp', 'sms', 'otro'
  )),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'cancelada')),
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  fecha_programada TIMESTAMP WITH TIME ZONE,
  fecha_completada TIMESTAMP WITH TIME ZONE,
  duracion_minutos INTEGER,
  resultado TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actividades_cliente ON actividades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_actividades_estado ON actividades(estado);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON actividades(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_actividades_user ON actividades(user_id);
ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own actividades" ON actividades
  FOR ALL USING (auth.uid() = user_id);

-- 4. Tabla recibís (no contable)
CREATE TABLE IF NOT EXISTS recibis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  procedimiento_id UUID REFERENCES procedimientos(id) ON DELETE SET NULL,
  numero TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  importe NUMERIC(12,2) NOT NULL,
  concepto TEXT NOT NULL,
  forma_pago TEXT NOT NULL DEFAULT 'efectivo',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recibis_cliente ON recibis(cliente_id);
ALTER TABLE recibis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recibis" ON recibis
  FOR ALL USING (auth.uid() = user_id);

-- 5. Función para obtener siguiente número de recibí
CREATE OR REPLACE FUNCTION next_recibi_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  last_num INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(numero FROM '\d+$') AS INTEGER)), 0
  ) INTO last_num
  FROM recibis
  WHERE user_id = p_user_id
  AND numero LIKE 'R-' || year_prefix || '-%';
  
  RETURN 'R-' || year_prefix || '-' || LPAD((last_num + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
