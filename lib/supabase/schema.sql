-- Tabla de auditoría para registro de eventos
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  action TEXT NOT NULL, -- create, update, delete, login, logout, etc.
  entity_type TEXT NOT NULL, -- cliente, cobro, gasto, procedimiento, etc.
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restored_at TIMESTAMP WITH TIME ZONE,
  restored_by UUID REFERENCES auth.users(id)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_restored_at ON audit_log(restored_at);

-- RLS (Row Level Security) para auditoría
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Solo los usuarios pueden ver sus propios logs, excepto admins que ven todo
CREATE POLICY "Users can view own audit logs" ON audit_log
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.jwt()->>'email' = 'feronikz@gmail.com'
  );

-- Solo el sistema puede insertar logs
CREATE POLICY "System can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (true);

-- Solo admins pueden restaurar
CREATE POLICY "Admins can restore audit logs" ON audit_log
  FOR UPDATE USING (
    auth.jwt()->>'email' = 'feronikz@gmail.com'
  );
