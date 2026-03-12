'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Cliente, ClienteInsert, ClienteUpdate } from '@/lib/supabase/types';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchClientes = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClientes(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const createCliente = async (input: Omit<ClienteInsert, 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    const { data, error } = await supabase
      .from('clientes')
      .insert({ ...input, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setClientes(prev => [data, ...prev]);
    return data;
  };

  const updateCliente = async (id: string, updates: ClienteUpdate) => {
    const { data, error } = await supabase
      .from('clientes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setClientes(prev => prev.map(c => (c.id === id ? data : c)));
    return data;
  };

  const deleteCliente = async (id: string) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw error;
    setClientes(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => { fetchClientes(); }, []);

  return { clientes, loading, error, fetchClientes, createCliente, updateCliente, deleteCliente };
}
