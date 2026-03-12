'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ClienteNota } from '@/lib/supabase/types';

export function useNotas(clienteId?: string) {
  const [notas, setNotas] = useState<ClienteNota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clienteId) {
      fetchNotas();
    } else {
      setNotas([]);
      setLoading(false);
    }
  }, [clienteId]);

  const fetchNotas = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cliente_notas')
        .select('*')
        .eq('cliente_id', clienteId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotas(data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar notas');
    } finally {
      setLoading(false);
    }
  };

  const createNota = async (nota: Omit<ClienteNota, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cliente_notas')
        .insert([{ ...nota, user_id: (await supabase.auth.getUser()).data.user?.id }])
        .select()
        .single();

      if (error) throw error;
      setNotas(prev => [data, ...prev]);
      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Error al crear nota');
    }
  };

  const updateNota = async (id: string, updates: Partial<ClienteNota>) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cliente_notas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setNotas(prev => prev.map(nota => nota.id === id ? data : nota));
      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Error al actualizar nota');
    }
  };

  const deleteNota = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('cliente_notas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotas(prev => prev.filter(nota => nota.id !== id));
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Error al eliminar nota');
    }
  };

  return {
    notas,
    loading,
    error,
    createNota,
    updateNota,
    deleteNota,
    refetch: fetchNotas
  };
}
