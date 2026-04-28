import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Procedimiento, Cliente, Cobro } from '@/lib/supabase/types';

interface ExpedienteConCliente extends Procedimiento {
  cliente: Cliente;
  total_cobrado: number;
  total_pendiente: number;
  esta_pagado_totalmente: boolean;
}

export function useExpedientes() {
  const [expedientes, setExpedientes] = useState<ExpedienteConCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useMemo(() => typeof window !== 'undefined' ? createClient() : null, []);

  const fetchExpedientes = async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener procedimientos con información de clientes
      const { data: procedimientos, error: procError } = await supabase
        .from('procedimientos')
        .select(`
          *,
          clientes (
            id,
            nombre,
            nif,
            telefono,
            email,
            estado
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (procError) throw procError;
      if (!procedimientos) return;

      // Para cada procedimiento, obtener sus cobros
      const expedientesConInfo = await Promise.all(
        procedimientos.map(async (proc: any) => {
          const { data: cobros } = await supabase
            .from('cobros')
            .select('importe')
            .eq('procedimiento_id', proc.id);

          const totalCobrado = cobros?.reduce((sum: number, c: { importe: number }) => sum + c.importe, 0) || 0;
          const totalPendiente = proc.presupuesto - totalCobrado;
          const estaPagadoTotalmente = totalPendiente <= 0;

          return {
            ...proc,
            cliente: proc.clientes,
            total_cobrado: totalCobrado,
            total_pendiente: totalPendiente,
            esta_pagado_totalmente: estaPagadoTotalmente,
          };
        })
      );

      setExpedientes(expedientesConInfo);
    } catch (err) {
      console.error('Error fetching expedientes:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Solo ejecutar en el cliente cuando supabase esté disponible
    if (typeof window !== 'undefined' && supabase) {
      fetchExpedientes();
    }
  }, [supabase]);

  // Funciones de filtrado
  const filtrarPorEstado = (estado: string) => {
    if (estado === 'todos') return expedientes;
    return expedientes.filter(exp => exp.estado === estado);
  };

  const filtrarPorCliente = (clienteNombre: string) => {
    if (!clienteNombre.trim()) return expedientes;
    const searchTerm = clienteNombre.toLowerCase();
    return expedientes.filter(exp => 
      exp.cliente.nombre.toLowerCase().includes(searchTerm)
    );
  };

  const filtrarPorPagado = (pagadoStatus: string) => {
    if (pagadoStatus === 'todos') return expedientes;
    if (pagadoStatus === 'pagados') return expedientes.filter(exp => exp.esta_pagado_totalmente);
    if (pagadoStatus === 'pendientes') return expedientes.filter(exp => !exp.esta_pagado_totalmente);
    return expedientes;
  };

  // Estadísticas
  const stats = {
    total: expedientes.length,
    pendientes: expedientes.filter(exp => exp.estado === 'pendiente').length,
    enProceso: expedientes.filter(exp => 
      ['pendiente_presentar', 'en_proceso', 'presentado', 'pendiente_resolucion', 'pendiente_recurso'].includes(exp.estado)
    ).length,
    resueltos: expedientes.filter(exp => exp.estado === 'resuelto').length,
    cerrados: expedientes.filter(exp => ['cerrado', 'archivado'].includes(exp.estado)).length,
    pagadosTotalmente: expedientes.filter(exp => exp.esta_pagado_totalmente).length,
    pendientesPago: expedientes.filter(exp => !exp.esta_pagado_totalmente).length,
    presupuestoTotal: expedientes.reduce((sum, exp) => sum + exp.presupuesto, 0),
    cobradoTotal: expedientes.reduce((sum, exp) => sum + exp.total_cobrado, 0),
    pendienteTotal: expedientes.reduce((sum, exp) => sum + exp.total_pendiente, 0),
  };

  return {
    expedientes,
    loading,
    error,
    stats,
    refetch: fetchExpedientes,
    filtrarPorEstado,
    filtrarPorCliente,
    filtrarPorPagado,
  };
}
