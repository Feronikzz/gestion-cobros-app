-- ==============================================================================
-- SISTEMA MULTI-USUARIO CON ROLES Y PERMISOS
-- ==============================================================================

-- 1. Tabla de usuarios extendida
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'user', 'guest')),
  department TEXT, -- Departamento: 'legal', 'admin', 'finance', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de equipos/despachos
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Relación usuarios-equipos
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES profiles(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 4. Permisos granulares
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'clientes', 'cobros', 'gastos', etc.
  resource_id UUID, -- NULL para acceso global al tipo de recurso
  permissions JSONB NOT NULL DEFAULT '{}', -- {'read': true, 'write': true, 'delete': false}
  granted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, resource_type, resource_id)
);

-- 5. Auditoría de accesos
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'login', 'view', 'create', 'update', 'delete'
  resource_type TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Configuración de notificaciones
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'new_cliente', 'cobro_created', etc.
  enabled BOOLEAN DEFAULT true,
  channels JSONB DEFAULT '{"email": true, "push": false, "sms": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_type)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);

-- RLS (Row Level Security) para todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update user profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Policies para teams
CREATE POLICY "Team members can view their teams" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can manage teams" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

-- Policies para team_members
CREATE POLICY "Team members can view team members" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm1
      WHERE tm1.team_id = team_members.team_id 
      AND tm1.user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can manage members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = team_members.team_id 
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

-- Policies para permissions
CREATE POLICY "Users can view own permissions" ON permissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all permissions" ON permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Policies para access_logs
CREATE POLICY "Users can view own access logs" ON access_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all access logs" ON access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Policies para notification_preferences
CREATE POLICY "Users can manage own notifications" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user' -- Rol por defecto
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para verificar permisos
CREATE OR REPLACE FUNCTION check_permission(
  user_uuid UUID,
  resource_type TEXT,
  required_permission TEXT,
  resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_global_permission BOOLEAN := FALSE;
  has_specific_permission BOOLEAN := FALSE;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO user_role FROM profiles WHERE id = user_uuid;
  
  -- Super admin tiene todos los permisos
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Admin tiene permisos globales de lectura/escritura
  IF user_role = 'admin' AND required_permission IN ('read', 'write') THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar permisos específicos
  SELECT EXISTS(
    SELECT 1 FROM permissions 
    WHERE user_id = user_uuid 
    AND resource_type = check_permission.resource_type
    AND (resource_id IS NULL OR permissions.resource_id = resource_id)
    AND (permissions->required_permission)::BOOLEAN = true
  ) INTO has_specific_permission;
  
  RETURN has_specific_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista de usuarios con permisos
CREATE VIEW user_permissions AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.department,
  p.is_active,
  COALESCE(
    json_agg(
      json_build_object(
        'resource_type', perm.resource_type,
        'resource_id', perm.resource_id,
        'permissions', perm.permissions
      )
    ) FILTER (WHERE perm.id IS NOT NULL),
    '[]'::json
  ) as permissions
FROM profiles p
LEFT JOIN permissions perm ON p.id = perm.user_id
GROUP BY p.id, p.email, p.full_name, p.role, p.department, p.is_active;

-- Datos iniciales
INSERT INTO teams (name, description, created_by) VALUES
  ('Despacho Principal', 'Equipo principal del despacho', (
    SELECT id FROM profiles WHERE email = 'feronikz@gmail.com' LIMIT 1
  ))
ON CONFLICT DO NOTHING;

-- Asignar al super admin al equipo principal
INSERT INTO team_members (team_id, user_id, role, invited_by)
SELECT 
  t.id,
  p.id,
  'owner',
  p.id
FROM teams t, profiles p
WHERE t.name = 'Despacho Principal' 
AND p.email = 'feronikz@gmail.com'
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Crear super admin si no existe
INSERT INTO profiles (id, email, full_name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'super_admin'
FROM auth.users 
WHERE email = 'feronikz@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE email = 'feronikz@gmail.com'
)
ON CONFLICT (email) DO UPDATE SET 
  role = 'super_admin',
  updated_at = NOW();
