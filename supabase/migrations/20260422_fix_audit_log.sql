-- =====================================================
-- FIX: Tabla audit_log con RLS correctas
-- =====================================================

-- 1. Crear tabla si no existe
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  entidad_nombre TEXT,
  accion TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  descripcion TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entidad ON audit_log(entidad);
CREATE INDEX IF NOT EXISTS idx_audit_accion ON audit_log(accion);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entidad_id ON audit_log(entidad_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_date ON audit_log(user_id, created_at);

-- 3. Habilitar RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas antiguas que puedan estar mal configuradas
DROP POLICY IF EXISTS audit_log_usuario ON audit_log;
DROP POLICY IF EXISTS audit_log_select ON audit_log;
DROP POLICY IF EXISTS audit_log_insert ON audit_log;

-- 5. Crear políticas correctas (separadas para SELECT e INSERT)
-- El usuario puede leer sus propios logs
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (user_id = auth.uid());

-- El usuario puede insertar logs donde user_id sea su propio id
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 6. Función de limpieza (30 días)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
