'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CierreMensual, Cobro, Reparto } from '@/lib/supabase/types';

interface MonthlySummary {
  mes: string;
  label: string;
  arrastreAnterior: number;
  cobradoMes: number;
  totalDisponible: number;
  repartidoMes: number;
  saldoFinal: number;
}

export function useCierreMensual() {
  const [cierres, setCierres] = useState<CierreMensual[]>([]);
  const [summary, setSummary] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const calculateMonthlySummary = async (months: string[], cobros: Cobro[], repartos: Reparto[]) => {
    const summary: MonthlySummary[] = [];
    
    for (let i = 0; i < months.length; i++) {
      const mes = months[i];
      const mesAnterior = i > 0 ? months[i - 1] : null;
      
      // Calcular arrastre anterior
      let arrastreAnterior = 0;
      if (mesAnterior) {
        const cierreAnterior = cierres.find(c => c.mes === mesAnterior);
        if (cierreAnterior) {
          arrastreAnterior = cierreAnterior.saldo_final;
        } else {
          // Si no hay cierre anterior, calcularlo dinámicamente
          const resumenAnterior = await calculateMonthSummary(mesAnterior, cobros, repartos, 0);
          arrastreAnterior = resumenAnterior.saldoFinal;
        }
      }
      
      const resumen = await calculateMonthSummary(mes, cobros, repartos, arrastreAnterior);
      summary.push(resumen);
    }
    
    return summary;
  };

  const calculateMonthSummary = async (mes: string, cobros: Cobro[], repartos: Reparto[], arrastreAnterior: number): Promise<MonthlySummary> => {
    // Filtrar cobros del mes (por fecha real del cobro)
    const cobrosMes = cobros.filter(cobro => 
      cobro.fecha_cobro.startsWith(mes)
    );
    const cobradoMes = cobrosMes.reduce((sum, cobro) => sum + cobro.importe, 0);
    
    // Filtrar repartos del mes
    const repartosMes = repartos.filter(reparto => reparto.mes === mes);
    const repartidoMes = repartosMes.reduce((sum, reparto) => sum + reparto.importe, 0);
    
    // Calcular totales
    const totalDisponible = arrastreAnterior + cobradoMes;
    const saldoFinal = totalDisponible - repartidoMes;
    
    // Obtener label del mes
    const [year, month] = mes.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const label = `${monthNames[parseInt(month) - 1]} ${year}`;
    
    return {
      mes,
      label,
      arrastreAnterior,
      cobradoMes,
      totalDisponible,
      repartidoMes,
      saldoFinal
    };
  };

  const fetchCierres = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('cierres_mensuales')
        .select('*')
        .order('mes', { ascending: true });

      if (error) throw error;
      setCierres(data || []);
      
      // Obtener cobros y repartos para calcular resumen
      const [{ data: cobros }, { data: repartos }] = await Promise.all([
        supabase.from('cobros').select('*'),
        supabase.from('repartos').select('*')
      ]);
      
      // Generar meses para el resumen
      const currentYear = new Date().getFullYear();
      const months = [];
      for (let year = currentYear - 1; year <= currentYear + 1; year++) {
        for (let month = 1; month <= 12; month++) {
          months.push(`${year}-${month.toString().padStart(2, '0')}`);
        }
      }
      
      const summaryData = await calculateMonthlySummary(months, cobros || [], repartos || []);
      setSummary(summaryData);
      
    } catch (error: any) {
      setError(error.message || 'Error al cargar cierres mensuales');
    } finally {
      setLoading(false);
    }
  };

  const createCierre = async (mes: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Encontrar el resumen calculado para este mes
      const resumen = summary.find(s => s.mes === mes);
      if (!resumen) throw new Error('No se encontró resumen para este mes');

      const { data, error } = await supabase
        .from('cierres_mensuales')
        .insert({
          user_id: user.id,
          mes,
          arrastre_anterior: resumen.arrastreAnterior,
          cobrado_mes: resumen.cobradoMes,
          repartido_mes: resumen.repartidoMes,
          saldo_final: resumen.saldoFinal,
          estado: 'cerrado'
        })
        .select()
        .single();

      if (error) throw error;
      
      setCierres(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear cierre mensual');
    }
  };

  const updateCierre = async (id: string, updates: Partial<CierreMensual>) => {
    try {
      const { data, error } = await supabase
        .from('cierres_mensuales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCierres(prev => prev.map(c => c.id === id ? data : c));
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar cierre mensual');
    }
  };

  const deleteCierre = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cierres_mensuales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCierres(prev => prev.filter(c => c.id !== id));
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar cierre mensual');
    }
  };

  useEffect(() => {
    fetchCierres();
  }, []);

  return {
    cierres,
    summary,
    loading,
    error,
    fetchCierres,
    createCierre,
    updateCierre,
    deleteCierre,
  };
}
