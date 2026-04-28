'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { auditProcedimiento } from '@/lib/audit';
import type { Procedimiento, ProcedimientoInsert, ProcedimientoUpdate } from '@/lib/supabase/types';

export function useProcedimientos(clienteId?: string) {
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => typeof window !== 'undefined' ? createClient() : null, []);

  const fetchProcedimientos = async () => {
    if (!supabase) return;
    
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
    if (!supabase) throw new Error('Supabase client no disponible');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabase
      .from('procedimientos')
      .insert({ ...input, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setProcedimientos(prev => [data, ...prev]);
    
    // Auditoría
    await auditProcedimiento.crear(data.id, data.titulo, '');
    
    return data;
  };

  const updateProcedimiento = async (id: string, updates: ProcedimientoUpdate) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    const procAnterior = procedimientos.find(p => p.id === id);
    
    const { data, error } = await supabase
      .from('procedimientos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setProcedimientos(prev => prev.map(p => (p.id === id ? data : p)));
    
    // Auditoría: detectar cambios específicos
    if (procAnterior) {
      const campos = Object.keys(updates) as Array<keyof ProcedimientoUpdate>;
      for (const campo of campos) {
        const valorAnterior = procAnterior[campo as keyof Procedimiento];
        const valorNuevo = updates[campo];
        if (valorAnterior !== valorNuevo) {
          await auditProcedimiento.actualizar(
            id,
            data.titulo,
            String(campo),
            valorAnterior,
            valorNuevo
          );
        }
      }
    }
    
    return data;
  };

  const deleteProcedimiento = async (id: string) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    const proc = procedimientos.find(p => p.id === id);
    
    const { error } = await supabase.from('procedimientos').delete().eq('id', id);
    if (error) throw error;
    setProcedimientos(prev => prev.filter(p => p.id !== id));
    
    // Auditoría
    await auditProcedimiento.eliminar(id, proc?.titulo || 'Expediente desconocido');
  };

  useEffect(() => {
    // Solo ejecutar en el cliente cuando supabase esté disponible
    if (typeof window !== 'undefined' && supabase) {
      fetchProcedimientos();
    }
  }, [supabase, clienteId]);

  return { procedimientos, loading, error, fetchProcedimientos, createProcedimiento, updateProcedimiento, deleteProcedimiento };
}
