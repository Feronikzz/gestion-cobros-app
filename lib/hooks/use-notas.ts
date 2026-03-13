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
    if (!clienteId) return;
    
    // Solo crear el cliente de Supabase en el cliente
    const supabase = typeof window !== 'undefined' ? createClient() : null;
    if (!supabase) return;
    
    try {
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
    // Solo crear el cliente de Supabase en el cliente
    const supabase = typeof window !== 'undefined' ? createClient() : null;
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      console.log('Creando nota:', { ...nota, user_id: user.id });

      const { data, error } = await supabase
        .from('cliente_notas')
        .insert([{ ...nota, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error Supabase detallado:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Error de base de datos: ${error.message || 'Error desconocido'}`);
      }
      
      if (!data) {
        throw new Error('No se devolvieron datos al crear la nota');
      }
      
      setNotas(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error completo al crear nota:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Error inesperado al crear nota');
      }
    }
  };

  const updateNota = async (id: string, updates: Partial<ClienteNota>) => {
    // Solo crear el cliente de Supabase en el cliente
    const supabase = typeof window !== 'undefined' ? createClient() : null;
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
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
    // Solo crear el cliente de Supabase en el cliente
    const supabase = typeof window !== 'undefined' ? createClient() : null;
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
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
