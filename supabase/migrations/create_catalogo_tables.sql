-- Crear tablas para el catálogo de servicios sincronizado en la nube
-- Esto reemplaza el almacenamiento local (localStorage) por Supabase

-- Tabla de categorías personalizadas del usuario
CREATE TABLE IF NOT EXISTS catalogo_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Tabla de procedimientos/títulos del catálogo
CREATE TABLE IF NOT EXISTS catalogo_procedimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  concepto TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, titulo)
);

-- Tabla de documentos requeridos por procedimiento
CREATE TABLE IF NOT EXISTS catalogo_documentos_requeridos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedimiento_id UUID NOT NULL REFERENCES catalogo_procedimientos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  obligatorio BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_catalogo_categorias_user ON catalogo_categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_procedimientos_user ON catalogo_procedimientos(user_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_procedimientos_categoria ON catalogo_procedimientos(categoria);
CREATE INDEX IF NOT EXISTS idx_catalogo_docs_procedimiento ON catalogo_documentos_requeridos(procedimiento_id);

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE catalogo_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_procedimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_documentos_requeridos ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven sus propias categorías
CREATE POLICY catalogo_categorias_usuario ON catalogo_categorias
  FOR ALL USING (user_id = auth.uid());

-- Política: usuarios solo ven sus propios procedimientos
CREATE POLICY catalogo_procedimientos_usuario ON catalogo_procedimientos
  FOR ALL USING (user_id = auth.uid());

-- Política: usuarios ven documentos de sus procedimientos
CREATE POLICY catalogo_docs_usuario ON catalogo_documentos_requeridos
  FOR ALL USING (
    procedimiento_id IN (
      SELECT id FROM catalogo_procedimientos WHERE user_id = auth.uid()
    )
  );

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_catalogo_categorias_updated_at ON catalogo_categorias;
CREATE TRIGGER update_catalogo_categorias_updated_at
  BEFORE UPDATE ON catalogo_categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_catalogo_procedimientos_updated_at ON catalogo_procedimientos;
CREATE TRIGGER update_catalogo_procedimientos_updated_at
  BEFORE UPDATE ON catalogo_procedimientos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
