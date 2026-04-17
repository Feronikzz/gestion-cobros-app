-- Tabla de auditoría/historial de cambios
-- Registra todas las operaciones CRUD en la aplicación
-- Límite de retención: 30 días (configurable)

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  
  -- Entidad afectada
  entidad TEXT NOT NULL, -- 'cliente', 'cobro', 'procedimiento', 'gasto', 'documento', etc.
  entidad_id TEXT,       -- ID del registro afectado
  entidad_nombre TEXT,   -- Nombre legible para mostrar
  
  -- Tipo de operación
  accion TEXT NOT NULL,  -- 'crear', 'actualizar', 'eliminar', 'adjuntar', 'desadjuntar', etc.
  
  -- Detalles del cambio
  campo TEXT,            -- Campo específico modificado (opcional)
  valor_anterior TEXT,   -- Valor anterior (JSON o texto)
  valor_nuevo TEXT,      -- Valor nuevo (JSON o texto)
  descripcion TEXT,      -- Descripción legible del cambio
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entidad ON audit_log(entidad);
CREATE INDEX IF NOT EXISTS idx_audit_accion ON audit_log(accion);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entidad_id ON audit_log(entidad_id);

-- Índice compuesto para filtros de fecha + usuario (muy común)
CREATE INDEX IF NOT EXISTS idx_audit_user_date ON audit_log(user_id, created_at);

-- Políticas RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Solo el propio usuario puede ver su historial
CREATE POLICY audit_log_usuario ON audit_log
  FOR ALL USING (user_id = auth.uid());

-- Función para limpiar registros antiguos (más de 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario sobre uso
COMMENT ON TABLE audit_log IS 'Registro de auditoría de todas las acciones CRUD. Retención máxima: 30 días.';
