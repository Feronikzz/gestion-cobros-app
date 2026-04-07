import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Actividad, ActividadInsert, ActividadUpdate } from '@/lib/supabase/types';

export function useActividades(clienteId?: string) {
  const supabase = typeof window !== 'undefined' ? createClient() : null;
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActividades = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      let query = supabase
        .from('actividades')
        .select('*')
        .order('created_at', { ascending: false });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setActividades(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && supabase) {
      fetchActividades();
    }
  }, [supabase, clienteId]);

  const createActividad = async (data: Omit<ActividadInsert, 'user_id'>) => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: err } = await supabase.from('actividades').insert({ ...data, user_id: user.id });
    if (err) throw err;
    await fetchActividades();
  };

  const updateActividad = async (id: string, data: ActividadUpdate) => {
    if (!supabase) return;
    const { error: err } = await supabase.from('actividades').update(data).eq('id', id);
    if (err) throw err;
    await fetchActividades();
  };

  const deleteActividad = async (id: string) => {
    if (!supabase) return;
    const { error: err } = await supabase.from('actividades').delete().eq('id', id);
    if (err) throw err;
    await fetchActividades();
  };

  const completeActividad = async (id: string, resultado?: string) => {
    if (!supabase) return;
    await supabase.from('actividades').update({
      estado: 'completada',
      fecha_completada: new Date().toISOString(),
      resultado: resultado || null,
    }).eq('id', id);
    await fetchActividades();
  };

  // Estadísticas
  const pendientes = actividades.filter(a => a.estado === 'pendiente').length;
  const hoy = actividades.filter(a => {
    if (!a.fecha_programada) return false;
    const today = new Date().toISOString().split('T')[0];
    return a.fecha_programada.startsWith(today);
  }).length;
  const vencidas = actividades.filter(a => {
    if (!a.fecha_programada || a.estado === 'completada' || a.estado === 'cancelada') return false;
    return new Date(a.fecha_programada) < new Date();
  }).length;

  return {
    actividades,
    loading,
    error,
    createActividad,
    updateActividad,
    deleteActividad,
    completeActividad,
    refetch: fetchActividades,
    stats: { pendientes, hoy, vencidas },
  };
}
