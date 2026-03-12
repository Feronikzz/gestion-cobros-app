'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Gasto } from '@/lib/supabase/types';

export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Cargar gastos
  const fetchGastos = async () => {
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
  };

  // Crear gasto
  const createGasto = async (gasto: Omit<Gasto, 'id' | 'user_id' | 'created_at'>) => {
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
    try {
      const { data, error: updateError } = await supabase
        .from('gastos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setGastos(prev => prev.map(g => g.id === id ? data : g));
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating gasto:', err);
      throw err;
    }
  };

  // Eliminar gasto
  const deleteGasto = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setGastos(prev => prev.filter(g => g.id !== id));
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting gasto:', err);
      throw err;
    }
  };

  // Subir factura
  const uploadFactura = async (file: File) => {
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
    fetchGastos();
  }, []);

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
