'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Reparto } from '@/lib/supabase/types';

export function useRepartos() {
  const [repartos, setRepartos] = useState<Reparto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => typeof window !== 'undefined' ? createClient() : null, []);

  const fetchRepartos = async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('repartos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setRepartos(data || []);
    } catch (error: any) {
      setError(error.message || 'Error al cargar repartos');
    } finally {
      setLoading(false);
    }
  };

  const createReparto = async (reparto: Omit<Reparto, 'id' | 'user_id' | 'created_at'>) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('repartos')
        .insert({ ...reparto, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setRepartos(prev => [data, ...prev]);
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear reparto');
    }
  };

  const updateReparto = async (id: string, updates: Partial<Reparto>) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const { data, error } = await supabase
        .from('repartos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setRepartos(prev => prev.map(r => r.id === id ? data : r));
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar reparto');
    }
  };

  const deleteReparto = async (id: string) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const { error } = await supabase
        .from('repartos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setRepartos(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar reparto');
    }
  };

  useEffect(() => {
    // Solo ejecutar en el cliente cuando supabase esté disponible
    if (typeof window !== 'undefined' && supabase) {
      fetchRepartos();
    }
  }, [supabase]);

  return {
    repartos,
    loading,
    error,
    fetchRepartos,
    createReparto,
    updateReparto,
    deleteReparto,
  };
}
