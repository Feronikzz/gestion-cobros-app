import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { auditRecibi } from '@/lib/audit';
import type { Recibi, RecibiInsert } from '@/lib/supabase/types';

export function useRecibis(clienteId?: string) {
  const supabase = useMemo(() => typeof window !== 'undefined' ? createClient() : null, []);
  const [recibis, setRecibis] = useState<Recibi[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecibis = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    let query = supabase.from('recibis').select('*').order('fecha', { ascending: false });
    if (clienteId) query = query.eq('cliente_id', clienteId);
    const { data } = await query;
    setRecibis(data || []);
    setLoading(false);
  }, [supabase, clienteId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && supabase) {
      fetchRecibis();
    }
  }, [fetchRecibis, supabase, clienteId]);

  const getNextNumero = async (): Promise<string> => {
    if (!supabase) return 'R-0001';
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'R-0001';
    const { data } = await supabase.rpc('next_recibi_number', { p_user_id: user.id });
    return data || 'R-0001';
  };

  const createRecibi = async (data: Omit<RecibiInsert, 'user_id'>) => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('recibis').insert({ ...data, user_id: user.id });
    if (error) throw error;
    await fetchRecibis();
    
    // Auditoría
    await auditRecibi.crear('', data.numero, data.importe, undefined, data.cliente_id);
  };

  const deleteRecibi = async (id: string) => {
    if (!supabase) return;
    const recibi = recibis.find(r => r.id === id);
    await supabase.from('recibis').delete().eq('id', id);
    await fetchRecibis();
    
    // Auditoría
    await auditRecibi.eliminar(id, recibi?.numero || '', undefined, recibi?.cliente_id);
  };

  return { recibis, loading, createRecibi, deleteRecibi, getNextNumero, refetch: fetchRecibis };
}
