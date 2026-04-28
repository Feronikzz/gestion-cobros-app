'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { auditGasto } from '@/lib/audit';
import type { Gasto } from '@/lib/supabase/types';

export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => typeof window !== 'undefined' ? createClient() : null, []);

  // Helper para obtener nombre del cliente
  const getClienteNombre = async (clienteId: string): Promise<string> => {
    if (!supabase || !clienteId) return 'Desconocido';
    const { data } = await supabase.from('clientes').select('nombre, apellido1, apellidos').eq('id', clienteId).single();
    if (!data) return 'Desconocido';
    return [data.nombre, data.apellido1 || data.apellidos].filter(Boolean).join(' ');
  };

  const fetchGastos = useCallback(async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('gastos')
        .select('*')
        .order('fecha', { ascending: false });

      if (fetchError) throw fetchError;

      setGastos(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching gastos:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Crear gasto
  const createGasto = async (gasto: Omit<Gasto, 'id' | 'user_id' | 'created_at'>) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      console.log('Creando gasto:', { ...gasto, user_id: user.id });

      const { data, error: insertError } = await supabase
        .from('gastos')
        .insert({
          ...gasto,
          user_id: user.id
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error Supabase detallado:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        throw new Error(`Error de base de datos: ${insertError.message || 'Error desconocido'}`);
      }
      
      if (!data) {
        throw new Error('No se devolvieron datos al crear el gasto');
      }
      
      setGastos(prev => [data, ...prev]);
      
      // Auditoría
      await auditGasto.crear(data.id, data.importe_total, data.conceptos?.join(', ') || '');
      
      return data;
    } catch (error) {
      console.error('Error completo al crear gasto:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Error inesperado al crear gasto');
      }
    }
  };

  // Actualizar gasto
  const updateGasto = async (id: string, updates: Partial<Omit<Gasto, 'id' | 'user_id' | 'created_at'>>) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const gastoAnterior = gastos.find(g => g.id === id);
      
      const { data, error: updateError } = await supabase
        .from('gastos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setGastos(prev => prev.map(g => g.id === id ? data : g));
      
      // Auditoría: detectar cambios
      if (gastoAnterior) {
        const concepto = data.conceptos?.join(', ') || gastoAnterior.conceptos?.join(', ') || '';
        const campos = Object.keys(updates) as Array<keyof typeof updates>;
        for (const campo of campos) {
          const anterior = gastoAnterior[campo as keyof Gasto];
          const nuevo = updates[campo];
          if (anterior !== nuevo) {
            await auditGasto.actualizar(id, concepto, String(campo), anterior, nuevo);
          }
        }
      }
      
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating gasto:', err);
      throw err;
    }
  };

  // Eliminar gasto
  const deleteGasto = async (id: string) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const { error: deleteError } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      const gasto = gastos.find(g => g.id === id);
      
      setGastos(prev => prev.filter(g => g.id !== id));
      
      // Auditoría
      await auditGasto.eliminar(id, gasto?.importe_total || 0, gasto?.conceptos?.join(', ') || '');
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting gasto:', err);
      throw err;
    }
  };

  // Subir factura
  const uploadFactura = async (file: File) => {
    if (!supabase) throw new Error('Supabase client no disponible');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      // Intentar subir la factura
      const { data, error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error al subir factura a Supabase Storage:', uploadError);
        
        // Si el bucket no existe, mostrar mensaje amigable
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('El bucket de facturas no está configurado en Supabase. Por favor, crea el bucket "facturas" en la configuración de Storage de Supabase.');
        }
        
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('facturas')
        .getPublicUrl(fileName);

      console.log('Factura subida exitosamente:', publicUrl);
      return publicUrl;
    } catch (err: any) {
      console.error('Error completo al subir factura:', err);
      
      // No establecer error global para no bloquear la creación del gasto
      // setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && supabase) {
      fetchGastos();
    }
  }, [fetchGastos, supabase]);

  return {
    gastos,
    loading,
    error,
    createGasto,
    updateGasto,
    deleteGasto,
    uploadFactura,
    refetch: fetchGastos
  };
}
