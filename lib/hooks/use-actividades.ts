import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { auditActividad } from '@/lib/audit';
import type { Actividad, ActividadInsert, ActividadUpdate } from '@/lib/supabase/types';

export function useActividades(clienteId?: string) {
  const supabase = useMemo(() => typeof window !== 'undefined' ? createClient() : null, []);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper para obtener nombre del cliente
  const getClienteNombre = async (clienteId: string): Promise<string> => {
    if (!supabase || !clienteId) return 'Desconocido';
    const { data } = await supabase.from('clientes').select('nombre, apellido1, apellidos').eq('id', clienteId).single();
    if (!data) return 'Desconocido';
    return [data.nombre, data.apellido1 || data.apellidos].filter(Boolean).join(' ');
  };

  const fetchActividades = useCallback(async () => {
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
  }, [supabase, clienteId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && supabase) {
      fetchActividades();
    }
  }, [fetchActividades, supabase, clienteId]);

  const createActividad = async (data: Omit<ActividadInsert, 'user_id'>) => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: err } = await supabase.from('actividades').insert({ ...data, user_id: user.id });
    if (err) throw err;
    await fetchActividades();
    
    // Auditoría con nombre del cliente
    const acts = await supabase.from('actividades').select('id').order('created_at', { ascending: false }).limit(1);
    const newId = acts.data?.[0]?.id || '';
    const clienteNombre = data.cliente_id ? await getClienteNombre(data.cliente_id) : undefined;
    await auditActividad.crear(newId, data.titulo || 'Sin título', clienteNombre);
  };

  const updateActividad = async (id: string, data: ActividadUpdate) => {
    if (!supabase) return;
    const actAnterior = actividades.find(a => a.id === id);
    const { error: err } = await supabase.from('actividades').update(data).eq('id', id);
    if (err) throw err;
    await fetchActividades();
    
    // Auditoría: detectar cambios
    if (actAnterior) {
      const clienteNombre = actAnterior.cliente_id ? await getClienteNombre(actAnterior.cliente_id) : undefined;
      const campos = Object.keys(data) as Array<keyof ActividadUpdate>;
      for (const campo of campos) {
        const anterior = actAnterior[campo as keyof Actividad];
        const nuevo = data[campo];
        if (anterior !== nuevo) {
          await auditActividad.actualizar(id, actAnterior.titulo || 'Sin título', String(campo), anterior, nuevo);
        }
      }
    }
  };

  const deleteActividad = async (id: string) => {
    if (!supabase) return;
    const actividad = actividades.find(a => a.id === id);
    const { error: err } = await supabase.from('actividades').delete().eq('id', id);
    if (err) throw err;
    await fetchActividades();
    
    // Auditoría con nombre del cliente
    const clienteNombre = actividad?.cliente_id ? await getClienteNombre(actividad.cliente_id) : undefined;
    await auditActividad.eliminar(id, actividad?.titulo || 'Sin título');
  };

  const completeActividad = async (id: string, resultado?: string) => {
    if (!supabase) return;
    const actividad = actividades.find(a => a.id === id);
    await supabase.from('actividades').update({
      estado: 'completada',
      fecha_completada: new Date().toISOString(),
      resultado: resultado || null,
    }).eq('id', id);
    await fetchActividades();
    
    // Auditoría con nombre del cliente
    const clienteNombre = actividad?.cliente_id ? await getClienteNombre(actividad.cliente_id) : undefined;
    await auditActividad.completar(id, actividad?.titulo || 'Sin título');
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
