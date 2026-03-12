'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Procedimiento, ProcedimientoInsert, ProcedimientoUpdate } from '@/lib/supabase/types';

export function useProcedimientos(clienteId?: string) {
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchProcedimientos = async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('procedimientos').select('*').order('created_at', { ascending: false });
      if (clienteId) query = query.eq('cliente_id', clienteId);
      const { data, error } = await query;
      if (error) throw error;
      setProcedimientos(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createProcedimiento = async (input: Omit<ProcedimientoInsert, 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('procedimientos')
      .insert({ ...input, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setProcedimientos(prev => [data, ...prev]);
    return data;
  };

  const updateProcedimiento = async (id: string, updates: ProcedimientoUpdate) => {
    const { data, error } = await supabase
      .from('procedimientos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setProcedimientos(prev => prev.map(p => (p.id === id ? data : p)));
    return data;
  };

  const deleteProcedimiento = async (id: string) => {
    const { error } = await supabase.from('procedimientos').delete().eq('id', id);
    if (error) throw error;
    setProcedimientos(prev => prev.filter(p => p.id !== id));
  };

  useEffect(() => { fetchProcedimientos(); }, [clienteId]);

  return { procedimientos, loading, error, fetchProcedimientos, createProcedimiento, updateProcedimiento, deleteProcedimiento };
}
