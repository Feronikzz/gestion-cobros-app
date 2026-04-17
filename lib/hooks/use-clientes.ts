'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { auditCliente } from '@/lib/audit';
import type { Cliente, ClienteInsert, ClienteUpdate } from '@/lib/supabase/types';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => typeof window !== 'undefined' ? createClient() : null, []);

  const fetchClientes = useCallback(async () => {
    if (!supabase) return;
    
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
  }, [supabase]);

  const createCliente = async (input: Omit<ClienteInsert, 'user_id'>) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    const { data, error } = await supabase
      .from('clientes')
      .insert({ ...input, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setClientes(prev => [data, ...prev]);
    
    // Auditoría: registrar creación
    await auditCliente.crear(data.id, data.nombre, { 
      email: data.email, 
      telefono: data.telefono,
      estado: data.estado 
    });
    
    return data;
  };

  const updateCliente = async (id: string, updates: ClienteUpdate) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    // Obtener datos anteriores para auditoría
    const clienteAnterior = clientes.find(c => c.id === id);
    
    const { data, error } = await supabase
      .from('clientes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setClientes(prev => prev.map(c => (c.id === id ? data : c)));
    
    // Auditoría: registrar actualización de campos
    if (clienteAnterior) {
      const camposActualizados = Object.keys(updates).filter(
        key => updates[key as keyof ClienteUpdate] !== clienteAnterior[key as keyof Cliente]
      );
      
      for (const campo of camposActualizados) {
        const valorAnterior = clienteAnterior[campo as keyof Cliente];
        const valorNuevo = updates[campo as keyof ClienteUpdate];
        
        if (valorAnterior !== valorNuevo) {
          await auditCliente.actualizar(
            id,
            data.nombre,
            campo,
            valorAnterior,
            valorNuevo
          );
        }
      }
    }
    
    return data;
  };

  const deleteCliente = async (id: string) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    // Obtener nombre del cliente para auditoría antes de eliminar
    const cliente = clientes.find(c => c.id === id);
    const nombreCliente = cliente?.nombre || 'Cliente desconocido';
    
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw error;
    setClientes(prev => prev.filter(c => c.id !== id));
    
    // Auditoría: registrar eliminación
    await auditCliente.eliminar(id, nombreCliente);
  };

  useEffect(() => {
    // Solo ejecutar en el cliente cuando supabase esté disponible
    if (typeof window !== 'undefined' && supabase) {
      fetchClientes();
    }
  }, [fetchClientes, supabase]);

  return { clientes, loading, error, fetchClientes, createCliente, updateCliente, deleteCliente };
}
