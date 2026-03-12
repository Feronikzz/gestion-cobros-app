'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Cobro } from '@/lib/supabase/types';

export function useCobros() {
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchCobros = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('cobros')
        .select('*')
        .order('fecha_cobro', { ascending: false });

      if (error) throw error;
      setCobros(data || []);
    } catch (error: any) {
      setError(error.message || 'Error al cargar cobros');
    } finally {
      setLoading(false);
    }
  };

  const createCobro = async (cobro: Omit<Cobro, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('cobros')
        .insert({ ...cobro, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setCobros(prev => [data, ...prev]);
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear cobro');
    }
  };

  const updateCobro = async (id: string, updates: Partial<Cobro>) => {
    try {
      const { data, error } = await supabase
        .from('cobros')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCobros(prev => prev.map(c => c.id === id ? data : c));
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar cobro');
    }
  };

  const deleteCobro = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cobros')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCobros(prev => prev.filter(c => c.id !== id));
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar cobro');
    }
  };

  useEffect(() => {
    fetchCobros();
  }, []);

  return {
    cobros,
    loading,
    error,
    fetchCobros,
    createCobro,
    updateCobro,
    deleteCobro,
  };
}
