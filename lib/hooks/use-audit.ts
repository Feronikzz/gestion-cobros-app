'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuditLog, AuditFilter, AuditStats } from '@/lib/supabase/audit-types';

export function useAudit() {
  // Solo crear el cliente de Supabase en el cliente
  const supabase = typeof window !== 'undefined' ? createClient() : null;
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registrar un evento de auditoría
  const logEvent = async (
    action: AuditLog['action'],
    entityType: AuditLog['entity_type'],
    entityId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    description?: string
  ) => {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('log-audit-event', {
        body: {
          user_id: user.id,
          user_email: user.email,
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_values: oldValues,
          new_values: newValues,
          description,
          ip_address: '', // Se obtiene en el edge function
          user_agent: navigator.userAgent,
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error logging audit event:', err);
    }
  };

  // Obtener logs con filtros
  const fetchLogs = async (filters: AuditFilter = {}) => {
    if (!supabase) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.user_email) {
        query = query.eq('user_email', filters.user_email);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,entity_id.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar logs de auditoría');
    } finally {
      setLoading(false);
    }
  };

  // Obtener estadísticas
  const fetchStats = async () => {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== 'feronikz@gmail.com') return;

      const { data, error } = await supabase.rpc('get_audit_stats');

      if (error) throw error;
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching audit stats:', err);
    }
  };

  // Restaurar un evento
  const restoreEvent = async (logId: string) => {
    if (!supabase) throw new Error('Supabase client no disponible');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== 'feronikz@gmail.com') {
        throw new Error('No tienes permisos para restaurar eventos');
      }

      const { data, error } = await supabase.functions.invoke('restore-audit-event', {
        body: { log_id: logId, restored_by: user.id }
      });

      if (error) throw error;
      
      // Refrescar logs
      await fetchLogs();
      await fetchStats();
      
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Error al restaurar evento');
    }
  };

  // Exportar logs
  const exportLogs = async (filters: AuditFilter = {}) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.functions.invoke('export-audit-logs', {
        body: { filters }
      });

      if (error) throw error;
      
      // Descargar CSV
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      throw new Error(err.message || 'Error al exportar logs');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && supabase) {
      fetchLogs();
      fetchStats();
    }
  }, [supabase]);

  return {
    logs,
    stats,
    loading,
    error,
    logEvent,
    fetchLogs,
    fetchStats,
    restoreEvent,
    exportLogs,
  };
}
