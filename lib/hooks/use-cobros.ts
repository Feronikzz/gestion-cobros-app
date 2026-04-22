'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { auditCobro } from '@/lib/audit';
import type { Cobro } from '@/lib/supabase/types';

export function useCobros() {
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Solo crear el cliente de Supabase en el cliente
  const supabase = typeof window !== 'undefined' ? createClient() : null;

  // Caché de nombres de clientes para auditoría
  const getClienteNombre = async (clienteId: string): Promise<string> => {
    if (!supabase || !clienteId) return 'Desconocido';
    const { data } = await supabase.from('clientes').select('nombre, apellido1, apellidos').eq('id', clienteId).single();
    if (!data) return 'Desconocido';
    return [data.nombre, data.apellido1 || data.apellidos].filter(Boolean).join(' ');
  };

  const fetchCobros = async () => {
    if (!supabase) return;
    
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
    if (!supabase) throw new Error('Supabase client no disponible');
    
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
      
      // Auditoría con nombre del cliente
      const clienteNombre = await getClienteNombre(data.cliente_id);
      await auditCobro.crear(data.id, data.importe, clienteNombre, data.metodo_pago);
      
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear cobro');
    }
  };

  const updateCobro = async (id: string, updates: Partial<Cobro>) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const cobroAnterior = cobros.find(c => c.id === id);
      
      const { data, error } = await supabase
        .from('cobros')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCobros(prev => prev.map(c => c.id === id ? data : c));
      
      // Auditoría: detectar cambios
      if (cobroAnterior) {
        const clienteNombre = await getClienteNombre(data.cliente_id);
        const campos = Object.keys(updates) as Array<keyof Cobro>;
        for (const campo of campos) {
          const anterior = cobroAnterior[campo];
          const nuevo = updates[campo];
          if (anterior !== nuevo) {
            await auditCobro.actualizar(id, data.importe, clienteNombre, String(campo), anterior, nuevo);
          }
        }
      }
      
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar cobro');
    }
  };

  const deleteCobro = async (id: string) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const cobro = cobros.find(c => c.id === id);
      
      const { error } = await supabase
        .from('cobros')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCobros(prev => prev.filter(c => c.id !== id));
      
      // Auditoría con nombre del cliente
      const clienteNombre = cobro ? await getClienteNombre(cobro.cliente_id) : 'Desconocido';
      await auditCobro.eliminar(id, cobro?.importe || 0, clienteNombre);
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar cobro');
    }
  };

  useEffect(() => {
    // Solo ejecutar en el cliente cuando supabase esté disponible
    if (typeof window !== 'undefined' && supabase) {
      fetchCobros();
    }
  }, [supabase]);

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
