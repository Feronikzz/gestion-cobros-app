import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { 
  Profile, 
  Team, 
  TeamMember, 
  Permission, 
  UserContext, 
  UserRole,
  TeamRole,
  ResourceType,
  PermissionAction,
  CreateUserInput,
  UpdateUserInput,
  InviteUserInput,
  UpdatePermissionInput
} from '@/lib/supabase/multi-user-types';

// Contexto para el usuario actual
const UserContextValue = createContext<UserContext | null>(null);

export function useUserContext() {
  const context = useContext(UserContextValue);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}

// Provider para el contexto de usuario
interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = typeof window !== 'undefined' ? createClient() : null;

  useEffect(() => {
    if (!supabase) return;

    const fetchUserContext = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Obtener perfil del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profile) {
          setLoading(false);
          return;
        }

        // Obtener equipo actual
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select(`
            *,
            team:teams(*)
          `)
          .eq('user_id', user.id);

        const currentTeamMember = teamMembers?.[0];
        const currentTeam = currentTeamMember?.team || null;

        // Obtener miembros del equipo
        const { data: allTeamMembers } = await supabase
          .from('team_members')
          .select(`
            *,
            profile:profiles(id, email, full_name, avatar_url, role)
          `)
          .eq('team_id', currentTeam?.id || '');

        // Obtener permisos del usuario
        const { data: permissions } = await supabase
          .from('permissions')
          .select('*')
          .eq('user_id', user.id);

        const context: UserContext = {
          profile,
          currentTeam,
          teamMembers: allTeamMembers || [],
          permissions: permissions || [],
          isAdmin: profile.role === 'admin' || profile.role === 'super_admin',
          isSuperAdmin: profile.role === 'super_admin'
        };

        setUserContext(context);
      } catch (error) {
        console.error('Error fetching user context:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserContext();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          setUserContext(null);
        } else if (event === 'SIGNED_IN') {
          fetchUserContext();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <UserContextValue.Provider value={userContext}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        children
      )}
    </UserContextValue.Provider>
  );
}

// Hook principal para gestión multi-usuario
export function useMultiUser() {
  const supabase = typeof window !== 'undefined' ? createClient() : null;
  const userContext = useUserContext();

  // Gestión de usuarios
  const createUser = async (input: CreateUserInput) => {
    if (!supabase || !userContext?.isSuperAdmin) {
      throw new Error('Unauthorized');
    }

    try {
      // 1. Crear usuario en auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: input.email,
        email_confirm: true,
        user_metadata: {
          full_name: input.full_name
        }
      });

      if (authError) throw authError;

      // 2. Crear perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: input.email,
          full_name: input.full_name,
          role: input.role,
          department: input.department
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // 3. Añadir al equipo si se especifica
      if (input.team_id) {
        await supabase
          .from('team_members')
          .insert({
            team_id: input.team_id,
            user_id: authData.user.id,
            role: 'member',
            invited_by: userContext.profile.id
          });
      }

      // 4. Asignar permisos si se especifican
      if (input.permissions) {
        const permissionsToInsert = Object.entries(input.permissions).map(([resource, actions]) => ({
          user_id: authData.user.id,
          resource_type: resource as ResourceType,
          permissions: actions.reduce((acc, action) => {
            acc[action] = true;
            return acc;
          }, {} as Record<PermissionAction, boolean>),
          granted_by: userContext.profile.id
        }));

        await supabase
          .from('permissions')
          .insert(permissionsToInsert);
      }

      return profile;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const updateUser = async (userId: string, input: UpdateUserInput) => {
    if (!supabase || !userContext?.isAdmin) {
      throw new Error('Unauthorized');
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: input.full_name,
          role: input.role,
          department: input.department,
          is_active: input.is_active
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Actualizar permisos si se especifican
      if (input.permissions) {
        // Eliminar permisos existentes
        await supabase
          .from('permissions')
          .delete()
          .eq('user_id', userId);

        // Insertar nuevos permisos
        const permissionsToInsert = Object.entries(input.permissions).map(([resource, actions]) => ({
          user_id: userId,
          resource_type: resource as ResourceType,
          permissions: actions.reduce((acc, action) => {
            acc[action] = true;
            return acc;
          }, {} as Record<PermissionAction, boolean>),
          granted_by: userContext.profile.id
        }));

        await supabase
          .from('permissions')
          .insert(permissionsToInsert);
      }

      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    if (!supabase || !userContext?.isSuperAdmin) {
      throw new Error('Unauthorized');
    }

    try {
      // Eliminar de auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      // Las tablas con ON DELETE CASCADE se limpiarán solas
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  // Gestión de equipos
  const createTeam = async (name: string, description?: string) => {
    if (!supabase || !userContext?.isAdmin) {
      throw new Error('Unauthorized');
    }

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name,
          description,
          created_by: userContext.profile.id
        })
        .select()
        .single();

      if (error) throw error;

      // Añadir al creador como owner
      await supabase
        .from('team_members')
        .insert({
          team_id: data.id,
          user_id: userContext.profile.id,
          role: 'owner',
          invited_by: userContext.profile.id
        });

      return data;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  };

  const inviteToTeam = async (teamId: string, input: InviteUserInput) => {
    if (!supabase || !userContext?.isAdmin) {
      throw new Error('Unauthorized');
    }

    try {
      // Verificar si el usuario existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', input.email)
        .single();

      if (!existingProfile) {
        throw new Error('User not found');
      }

      // Añadir al equipo
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: existingProfile.id,
          role: input.role,
          invited_by: userContext.profile.id
        })
        .select(`
          *,
          profile:profiles(id, email, full_name, avatar_url, role)
        `)
        .single();

      if (error) throw error;

      // Asignar permisos si se especifican
      if (input.permissions) {
        const permissionsToInsert = Object.entries(input.permissions).map(([resource, actions]) => ({
          user_id: existingProfile.id,
          resource_type: resource as ResourceType,
          permissions: actions.reduce((acc, action) => {
            acc[action] = true;
            return acc;
          }, {} as Record<PermissionAction, boolean>),
          granted_by: userContext.profile.id
        }));

        await supabase
          .from('permissions')
          .insert(permissionsToInsert);
      }

      return data;
    } catch (error) {
      console.error('Error inviting to team:', error);
      throw error;
    }
  };

  const removeFromTeam = async (teamId: string, userId: string) => {
    if (!supabase || !userContext?.isAdmin) {
      throw new Error('Unauthorized');
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing from team:', error);
      throw error;
    }
  };

  // Gestión de permisos
  const updatePermissions = async (input: UpdatePermissionInput) => {
    if (!supabase || !userContext?.isAdmin) {
      throw new Error('Unauthorized');
    }

    try {
      const { data, error } = await supabase
        .from('permissions')
        .upsert({
          user_id: input.user_id,
          resource_type: input.resource_type,
          resource_id: input.resource_id,
          permissions: input.permissions,
          granted_by: userContext.profile.id,
          expires_at: input.expires_at
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating permissions:', error);
      throw error;
    }
  };

  // Obtener todos los usuarios
  const getUsers = async () => {
    if (!supabase || !userContext?.isAdmin) {
      throw new Error('Unauthorized');
    }

    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  // Obtener logs de acceso
  const getAccessLogs = async (limit = 100) => {
    if (!supabase || !userContext?.isAdmin) {
      throw new Error('Unauthorized');
    }

    try {
      const { data, error } = await supabase
        .from('access_logs')
        .select(`
          *,
          profile:profiles(email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching access logs:', error);
      throw error;
    }
  };

  return {
    // Contexto
    userContext,
    
    // Gestión de usuarios
    createUser,
    updateUser,
    deleteUser,
    getUsers,
    
    // Gestión de equipos
    createTeam,
    inviteToTeam,
    removeFromTeam,
    
    // Gestión de permisos
    updatePermissions,
    
    // Logs
    getAccessLogs
  };
}
