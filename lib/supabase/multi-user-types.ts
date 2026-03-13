// ==============================================================================
// TIPOS PARA SISTEMA MULTI-USUARIO
// ==============================================================================

export type UserRole = 'super_admin' | 'admin' | 'user' | 'guest';
export type TeamRole = 'owner' | 'admin' | 'member';
export type PermissionAction = 'read' | 'write' | 'delete' | 'admin';
export type ResourceType = 'clientes' | 'cobros' | 'gastos' | 'procedimientos' | 'facturas' | 'repartos' | 'cierre' | 'notas' | 'audit' | 'users' | 'teams';

// Perfil de usuario extendido
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Equipo/Despacho
export interface Team {
  id: string;
  name: string;
  description: string | null;
  settings: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Miembros del equipo
export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  invited_by: string;
  joined_at: string;
  // Campos joined
  profile?: Profile;
  team?: Team;
}

// Permisos granulares
export interface Permission {
  id: string;
  user_id: string;
  resource_type: ResourceType;
  resource_id: string | null;
  permissions: Record<PermissionAction, boolean>;
  granted_by: string;
  created_at: string;
  expires_at: string | null;
}

// Logs de acceso
export interface AccessLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: ResourceType | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
  // Campos joined
  profile?: Profile;
}

// Preferencias de notificación
export interface NotificationPreference {
  id: string;
  user_id: string;
  event_type: string;
  enabled: boolean;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  created_at: string;
}

// Vista de usuarios con permisos
export interface UserWithPermissions {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  permissions: Permission[];
}

// Contexto de usuario actual
export interface UserContext {
  profile: Profile;
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  permissions: Permission[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

// Configuración de permisos por defecto por rol
export const ROLE_PERMISSIONS = {
  super_admin: {
    global: true,
    resources: [
      'clientes', 'cobros', 'gastos', 'procedimientos', 
      'facturas', 'repartos', 'cierre', 'notas', 'audit', 
      'users', 'teams'
    ] as ResourceType[],
    actions: ['read', 'write', 'delete', 'admin'] as PermissionAction[]
  },
  admin: {
    global: true,
    resources: [
      'clientes', 'cobros', 'gastos', 'procedimientos', 
      'facturas', 'repartos', 'cierre', 'notas', 'audit'
    ] as ResourceType[],
    actions: ['read', 'write'] as PermissionAction[]
  },
  user: {
    global: false,
    resources: [
      'clientes', 'cobros', 'gastos', 'procedimientos', 
      'facturas', 'repartos', 'cierre', 'notas'
    ] as ResourceType[],
    actions: ['read'] as PermissionAction[]
  },
  guest: {
    global: false,
    resources: ['clientes', 'cobros'] as ResourceType[],
    actions: ['read'] as PermissionAction[]
  }
} as const;

// Tipos para gestión de equipos
export interface CreateTeamInput {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface InviteUserInput {
  email: string;
  role: TeamRole;
  permissions?: Partial<Record<ResourceType, PermissionAction[]>>;
}

export interface UpdatePermissionInput {
  user_id: string;
  resource_type: ResourceType;
  resource_id?: string;
  permissions: Partial<Record<PermissionAction, boolean>>;
  expires_at?: string;
}

// Tipos para dashboard multi-usuario
export interface TeamStats {
  total_users: number;
  active_users: number;
  total_clients: number;
  total_revenue: number;
  recent_activity: AccessLog[];
}

// Tipos para auditoría mejorada
export interface EnhancedAuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: ResourceType;
  entity_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  team_id: string | null;
  created_at: string;
  restored_at: string | null;
  restored_by: string | null;
  // Campos joined
  profile?: Profile;
  team?: Team;
}

// Filtros para logs multi-usuario
export interface MultiUserAuditFilter {
  user_id?: string;
  team_id?: string;
  action?: string;
  entity_type?: ResourceType;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Configuración de notificaciones
export interface NotificationConfig {
  new_cliente: boolean;
  cliente_updated: boolean;
  cobro_created: boolean;
  cobro_updated: boolean;
  gasto_created: boolean;
  user_invited: boolean;
  team_updated: boolean;
  system_alerts: boolean;
}

// Tipos para gestión de usuarios
export interface CreateUserInput {
  email: string;
  full_name?: string;
  role: UserRole;
  department?: string;
  team_id?: string;
  permissions?: Partial<Record<ResourceType, PermissionAction[]>>;
}

export interface UpdateUserInput {
  full_name?: string;
  role?: UserRole;
  department?: string;
  is_active?: boolean;
  permissions?: Partial<Record<ResourceType, PermissionAction[]>>;
}

// Helper functions
export function hasPermission(
  user: UserContext,
  resource: ResourceType,
  action: PermissionAction,
  resourceId?: string
): boolean {
  // Super admin tiene todos los permisos
  if (user.isSuperAdmin) return true;
  
  // Admin tiene permisos globales en la mayoría de recursos
  if (user.isAdmin && action !== 'delete') return true;
  
  // Verificar permisos específicos
  const permission = user.permissions.find(p => 
    p.resource_type === resource && 
    (p.resource_id === resourceId || p.resource_id === null)
  );
  
  return permission?.permissions[action] || false;
}

export function canAccessResource(
  user: UserContext,
  resourceType: ResourceType,
  resourceId: string,
  action: PermissionAction = 'read'
): boolean {
  return hasPermission(user, resourceType, action, resourceId);
}

export function getTeamMembersByRole(
  members: TeamMember[],
  role: TeamRole
): TeamMember[] {
  return members.filter(member => member.role === role);
}

export function isUserInTeam(
  user: UserContext,
  teamId: string
): boolean {
  return user.currentTeam?.id === teamId || 
         user.teamMembers.some(m => m.team_id === teamId);
}
