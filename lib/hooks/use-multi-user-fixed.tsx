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

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profile) {
          setLoading(false);
          return;
        }

        const { data: teamMembers } = await supabase
          .from('team_members')
          .select(`*, team:teams(*)`)
          .eq('user_id', user.id);

        const currentTeamMember = teamMembers?.[0];
        const currentTeam = currentTeamMember?.team || null;

        const { data: allTeamMembers } = await supabase
          .from('team_members')
          .select(`*, profile:profiles(id, email, full_name, avatar_url, role)`)
          .eq('team_id', currentTeam?.id || '');

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        setUserContext(null);
      } else if (event === 'SIGNED_IN') {
        fetchUserContext();
      }
    });

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

export function useMultiUser() {
  const supabase = typeof window !== 'undefined' ? createClient() : null;
  const userContext = useUserContext();

  const createUser = async (input: CreateUserInput) => {
    if (!supabase || !userContext?.isSuperAdmin) throw new Error('Unauthorized');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      user_metadata: { full_name: input.full_name }
    });
    if (authError) throw authError;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({ id: authData.user.id, email: input.email, full_name: input.full_name, role: input.role, department: input.department })
      .select().single();
    if (profileError) throw profileError;
    if (input.team_id) {
      await supabase.from('team_members').insert({ team_id: input.team_id, user_id: authData.user.id, role: 'member', invited_by: userContext.profile.id });
    }
    if (input.permissions) {
      await supabase.from('permissions').insert(
        Object.entries(input.permissions).map(([resource, actions]) => ({
          user_id: authData.user.id,
          resource_type: resource as ResourceType,
          permissions: (actions as PermissionAction[]).reduce((acc: Record<PermissionAction, boolean>, action: PermissionAction) => { acc[action] = true; return acc; }, {} as Record<PermissionAction, boolean>),
          granted_by: userContext.profile.id
        }))
      );
    }
    return profile;
  };

  const updateUser = async (userId: string, input: UpdateUserInput) => {
    if (!supabase || !userContext?.isAdmin) throw new Error('Unauthorized');
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: input.full_name, role: input.role, department: input.department, is_active: input.is_active })
      .eq('id', userId).select().single();
    if (error) throw error;
    if (input.permissions) {
      await supabase.from('permissions').delete().eq('user_id', userId);
      await supabase.from('permissions').insert(
        Object.entries(input.permissions).map(([resource, actions]) => ({
          user_id: userId,
          resource_type: resource as ResourceType,
          permissions: (actions as PermissionAction[]).reduce((acc: Record<PermissionAction, boolean>, action: PermissionAction) => { acc[action] = true; return acc; }, {} as Record<PermissionAction, boolean>),
          granted_by: userContext.profile.id
        }))
      );
    }
    return data;
  };

  const deleteUser = async (userId: string) => {
    if (!supabase || !userContext?.isSuperAdmin) throw new Error('Unauthorized');
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    return true;
  };

  const createTeam = async (name: string, description?: string) => {
    if (!supabase || !userContext?.isAdmin) throw new Error('Unauthorized');
    const { data, error } = await supabase.from('teams').insert({ name, description, created_by: userContext.profile.id }).select().single();
    if (error) throw error;
    await supabase.from('team_members').insert({ team_id: data.id, user_id: userContext.profile.id, role: 'owner', invited_by: userContext.profile.id });
    return data;
  };

  const inviteToTeam = async (teamId: string, input: InviteUserInput) => {
    if (!supabase || !userContext?.isAdmin) throw new Error('Unauthorized');
    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', input.email).single();
    if (!existingProfile) throw new Error('User not found');
    const { data, error } = await supabase.from('team_members')
      .insert({ team_id: teamId, user_id: existingProfile.id, role: input.role, invited_by: userContext.profile.id })
      .select(`*, profile:profiles(id, email, full_name, avatar_url, role)`).single();
    if (error) throw error;
    if (input.permissions) {
      await supabase.from('permissions').insert(
        Object.entries(input.permissions).map(([resource, actions]) => ({
          user_id: existingProfile.id,
          resource_type: resource as ResourceType,
          permissions: (actions as PermissionAction[]).reduce((acc: Record<PermissionAction, boolean>, action: PermissionAction) => { acc[action] = true; return acc; }, {} as Record<PermissionAction, boolean>),
          granted_by: userContext.profile.id
        }))
      );
    }
    return data;
  };

  const removeFromTeam = async (teamId: string, userId: string) => {
    if (!supabase || !userContext?.isAdmin) throw new Error('Unauthorized');
    const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
    if (error) throw error;
    return true;
  };

  const updatePermissions = async (input: UpdatePermissionInput) => {
    if (!supabase || !userContext?.isAdmin) throw new Error('Unauthorized');
    const { data, error } = await supabase.from('permissions').upsert({
      user_id: input.user_id, resource_type: input.resource_type, resource_id: input.resource_id,
      permissions: input.permissions, granted_by: userContext.profile.id, expires_at: input.expires_at
    }).select().single();
    if (error) throw error;
    return data;
  };

  const getUsers = async () => {
    if (!supabase || !userContext?.isAdmin) throw new Error('Unauthorized');
    const { data, error } = await supabase.from('user_permissions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  };

  const getAccessLogs = async (limit = 100) => {
    if (!supabase || !userContext?.isAdmin) throw new Error('Unauthorized');
    const { data, error } = await supabase.from('access_logs')
      .select(`*, profile:profiles(email, full_name)`)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  };

  return { userContext, createUser, updateUser, deleteUser, getUsers, createTeam, inviteToTeam, removeFromTeam, updatePermissions, getAccessLogs };
}
