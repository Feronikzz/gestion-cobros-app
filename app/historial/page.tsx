'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { getAuditLog, type FiltrosAudit } from '@/lib/audit';
import type { AuditLog, TipoEntidad, TipoAccion } from '@/lib/supabase/types';
import {
  History, Filter, Search, Download, RefreshCw,
  Activity, Eye, AlertCircle, CheckCircle, FileText,
  Users, CreditCard, Receipt, Archive, Plus, Pencil, Trash2,
  FileUp, FileMinus, Send, CheckSquare, X, Wrench, ShieldAlert,
  Loader2, Database, Copy, TrendingUp, Calendar
} from 'lucide-react';
import { StatsAccordion } from '@/components/stats-accordion';

type FiltroRapido = 'hoy' | 'ayer' | 'semana' | 'mes' | 'todo';

const LABELS_FILTRO: Record<FiltroRapido, string> = {
  hoy: 'Hoy', ayer: 'Ayer', semana: 'Esta semana', mes: 'Este mes', todo: 'Todo (30 días)',
};

const LABELS_ENTIDAD: Record<string, string> = {
  cliente: 'Cliente', procedimiento: 'Expediente', cobro: 'Cobro', gasto: 'Gasto',
  documento: 'Documento', factura: 'Factura', recibi: 'Recibí', actividad: 'Actividad', catalogo: 'Catálogo',
};

const LABELS_ACCION: Record<string, string> = {
  crear: 'Crear', actualizar: 'Actualizar', eliminar: 'Eliminar',
  adjuntar: 'Adjuntar', desadjuntar: 'Desadjuntar', presentar: 'Presentar',
  resolver: 'Resolver', generar: 'Generar', exportar: 'Exportar',
};

const SQL_MIGRATION = `-- Ejecutar en Supabase SQL Editor:

DROP TABLE IF EXISTS audit_log CASCADE;

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  entidad_nombre TEXT,
  accion TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  descripcion TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_user_date ON audit_log(user_id, created_at);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY audit_log_delete ON audit_log
  FOR DELETE USING (user_id = auth.uid());`;

export default function HistorialPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>('hoy');
  const [entidadFilter, setEntidadFilter] = useState<TipoEntidad | ''>('');
  const [accionFilter, setAccionFilter] = useState<TipoAccion | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [diagStatus, setDiagStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [diagResult, setDiagResult] = useState<any>(null);
  const [showSetupSQL, setShowSetupSQL] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const diagRanRef = useRef(false);

  const calcularFechas = useCallback((): { desde: string; hasta: string } => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fin = new Date(); fin.setHours(23, 59, 59, 999);
    switch (filtroRapido) {
      case 'hoy': return { desde: hoy.toISOString(), hasta: fin.toISOString() };
      case 'ayer': { const a = new Date(hoy); a.setDate(a.getDate() - 1); const f = new Date(a); f.setHours(23,59,59,999); return { desde: a.toISOString(), hasta: f.toISOString() }; }
      case 'semana': { const i = new Date(hoy); i.setDate(hoy.getDate() - hoy.getDay() + 1); return { desde: i.toISOString(), hasta: fin.toISOString() }; }
      case 'mes': { const i = new Date(hoy); i.setDate(1); return { desde: i.toISOString(), hasta: fin.toISOString() }; }
      case 'todo': { const h = new Date(hoy); h.setDate(h.getDate() - 30); return { desde: h.toISOString(), hasta: fin.toISOString() }; }
    }
  }, [filtroRapido]);

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { desde, hasta } = calcularFechas();
      const data = await getAuditLog({ fechaDesde: desde, fechaHasta: hasta, entidad: entidadFilter || undefined, accion: accionFilter || undefined, limit: 1000 });
      setLogs(data);
      if (data.length === 0 && !diagRanRef.current) {
        diagRanRef.current = true;
        runDiagnostic();
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial');
      if (!diagRanRef.current) {
        diagRanRef.current = true;
        runDiagnostic();
      }
    } finally { setLoading(false); }
  }, [calcularFechas, entidadFilter, accionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const runDiagnostic = async () => {
    setDiagStatus('checking');
    try {
      const res = await fetch('/api/audit-check');
      const data = await res.json();
      setDiagResult(data); setDiagStatus(data.ok ? 'ok' : 'error');
    } catch { setDiagStatus('error'); setDiagResult({ ok: false, error: 'No se pudo conectar con el diagnóstico' }); }
  };

  const copySQL = () => { navigator.clipboard.writeText(SQL_MIGRATION); setCopiedSQL(true); setTimeout(() => setCopiedSQL(false), 2000); };

  const cleanupDiagnosticRecords = async () => {
    try {
      const res = await fetch('/api/audit-check', { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        fetchLogs();
      }
    } catch { /* ignore */ }
  };

  const filteredLogs = useMemo(() => {
    if (!busqueda) return logs;
    const s = busqueda.toLowerCase();
    return logs.filter(log => log.descripcion?.toLowerCase().includes(s) || log.entidad_nombre?.toLowerCase().includes(s) || log.entidad_id?.toLowerCase().includes(s) || log.accion?.toLowerCase().includes(s) || log.entidad?.toLowerCase().includes(s));
  }, [logs, busqueda]);

  const stats = useMemo(() => {
    const porAccion = new Map<string, number>();
    filteredLogs.forEach(log => porAccion.set(log.accion, (porAccion.get(log.accion) || 0) + 1));
    return { total: filteredLogs.length, porAccion };
  }, [filteredLogs]);

  const accionBadgeClass = (accion: string) => {
    switch (accion) {
      case 'crear': return 'badge-green';
      case 'actualizar': return 'badge-blue';
      case 'eliminar': return 'badge-red';
      case 'adjuntar': return 'badge-purple';
      case 'presentar': return 'badge-amber';
      default: return 'badge-gray';
    }
  };

  const getEntityIcon = (entidad: string) => {
    switch (entidad) {
      case 'cliente': return <Users className="w-4 h-4" />;
      case 'cobro': return <CreditCard className="w-4 h-4" />;
      case 'gasto': return <Receipt className="w-4 h-4" />;
      case 'procedimiento': return <FileText className="w-4 h-4" />;
      case 'factura': return <Receipt className="w-4 h-4" />;
      case 'documento': return <Archive className="w-4 h-4" />;
      case 'recibi': return <CreditCard className="w-4 h-4" />;
      case 'actividad': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActionIcon = (accion: string) => {
    switch (accion) {
      case 'crear': return <Plus className="w-4 h-4" />;
      case 'actualizar': return <Pencil className="w-4 h-4" />;
      case 'eliminar': return <Trash2 className="w-4 h-4" />;
      case 'adjuntar': return <FileUp className="w-4 h-4" />;
      case 'desadjuntar': return <FileMinus className="w-4 h-4" />;
      case 'presentar': return <Send className="w-4 h-4" />;
      case 'resolver': return <CheckSquare className="w-4 h-4" />;
      case 'generar': return <FileText className="w-4 h-4" />;
      case 'exportar': return <Download className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatTime = (d: string) => new Date(d).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    const rows = filteredLogs.map(log => ({ Fecha: formatDate(log.created_at), Usuario: log.user_email, Accion: log.accion, Entidad: log.entidad, Nombre: log.entidad_nombre, Descripcion: log.descripcion, Campo: log.campo, 'Valor Anterior': log.valor_anterior, 'Valor Nuevo': log.valor_nuevo }));
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `historial-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const activeFiltersCount = [entidadFilter, accionFilter, busqueda].filter(Boolean).length;

  if (loading && logs.length === 0) {
    return (
      <LayoutShell title="Historial" description="Registro completo de todos los cambios realizados en la aplicación.">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando historial...</div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Historial" description="Registro completo de todos los cambios realizados en la aplicación.">

      {/* Toolbar */}
      <div className="page-toolbar">
        <h2>Historial de Actividad</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={cleanupDiagnosticRecords} className="btn btn-secondary" title="Borrar registros de diagnóstico">
            <Trash2 className="w-4 h-4" /> Limpiar tests
          </button>
          <button onClick={handleExport} disabled={filteredLogs.length === 0} className="btn btn-secondary" style={{ opacity: filteredLogs.length === 0 ? 0.4 : 1 }}>
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button onClick={() => { setDiagStatus('idle'); fetchLogs(); }} disabled={loading} className="btn btn-primary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>
      </div>

      {/* Banners de diagnóstico */}
      {error && (
        <div className="error" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <ShieldAlert className="w-5 h-5" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p className="font-semibold">Error al cargar historial</p>
              <p className="text-sm" style={{ marginTop: 4 }}>{error}</p>
              {diagStatus === 'error' && diagResult && (
                <p className="text-sm" style={{ marginTop: 4 }}><strong>Diagnóstico:</strong> {diagResult.fix || diagResult.error}</p>
              )}
              <button onClick={() => setShowSetupSQL(true)} className="btn btn-primary" style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                <Database className="w-4 h-4" /> Ver SQL de configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {diagStatus === 'checking' && (
        <div className="info" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Verificando tabla audit_log en Supabase...
        </div>
      )}

      {diagStatus === 'ok' && !error && logs.length === 0 && !loading && (
        <div className="success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle className="w-4 h-4" /> Tabla audit_log verificada ({diagResult?.totalRecords || 0} registros). Las acciones futuras se registrarán aquí.
        </div>
      )}

      {diagStatus === 'error' && !error && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p className="font-semibold" style={{ color: '#92400e' }}>La tabla de historial no está configurada</p>
              <p className="text-sm" style={{ color: '#b45309', marginTop: 4 }}>
                {diagResult?.fix || 'Necesitas ejecutar el SQL de configuración en Supabase para activar el historial.'}
              </p>
              {diagResult?.error && (
                <p className="text-sm" style={{ color: '#92400e', fontFamily: 'monospace', marginTop: 4 }}>Error: {diagResult.error} {diagResult.code ? `(${diagResult.code})` : ''}</p>
              )}
              {diagResult?.sqlFix && (
                <div style={{ position: 'relative', marginTop: '0.75rem' }}>
                  <button onClick={() => { navigator.clipboard.writeText(diagResult.sqlFix); setCopiedSQL(true); setTimeout(() => setCopiedSQL(false), 2000); }} className="btn btn-secondary" style={{ position: 'absolute', top: 8, right: 8, padding: '0.25rem 0.5rem', fontSize: '0.7rem', minHeight: 'auto' }}>
                    <Copy className="w-3 h-3" /> {copiedSQL ? 'Copiado!' : 'Copiar'}
                  </button>
                  <pre style={{ background: '#1e293b', color: '#4ade80', fontSize: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>{diagResult.sqlFix}</pre>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button onClick={() => setShowSetupSQL(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                  <Database className="w-4 h-4" /> Ver SQL completo
                </button>
                <button onClick={runDiagnostic} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                  <Wrench className="w-4 h-4" /> Re-verificar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas — gradient cards como clientes/cobros */}
      <StatsAccordion title="Resumen de Registros">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-100 text-sm font-medium mb-1">Total eventos</div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-blue-100 text-xs mt-1">{LABELS_FILTRO[filtroRapido]}</div>
              </div>
              <div className="p-3 bg-white/20 rounded-lg"><Activity className="w-6 h-6 text-white" /></div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-100 text-sm font-medium mb-1">Creados</div>
                <div className="text-2xl font-bold">{stats.porAccion.get('crear') || 0}</div>
                <div className="text-green-100 text-xs mt-1">Registros nuevos</div>
              </div>
              <div className="p-3 bg-white/20 rounded-lg"><Plus className="w-6 h-6 text-white" /></div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-amber-100 text-sm font-medium mb-1">Actualizados</div>
                <div className="text-2xl font-bold">{stats.porAccion.get('actualizar') || 0}</div>
                <div className="text-amber-100 text-xs mt-1">Modificaciones</div>
              </div>
              <div className="p-3 bg-white/20 rounded-lg"><Pencil className="w-6 h-6 text-white" /></div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-red-100 text-sm font-medium mb-1">Eliminados</div>
                <div className="text-2xl font-bold">{stats.porAccion.get('eliminar') || 0}</div>
                <div className="text-red-100 text-xs mt-1">Registros borrados</div>
              </div>
              <div className="p-3 bg-white/20 rounded-lg"><Trash2 className="w-6 h-6 text-white" /></div>
            </div>
          </div>
        </div>
      </StatsAccordion>

      {/* Búsqueda y Filtros — mismo estilo que clientes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        {/* Búsqueda principal */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en historial por descripción, nombre, entidad..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              style={{ fontSize: '1rem' }}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros de período */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Período:</span>
          {(Object.keys(LABELS_FILTRO) as FiltroRapido[]).map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroRapido(tipo)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                filtroRapido === tipo
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
              style={{ fontSize: '0.875rem' }}
            >
              {LABELS_FILTRO[tipo]}
            </button>
          ))}
        </div>

        {/* Filtros avanzados */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                showFilters || activeFiltersCount > 0
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>Filtros{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
              </div>
            </button>
          </div>
          {activeFiltersCount > 0 && (
            <button onClick={() => { setEntidadFilter(''); setAccionFilter(''); setBusqueda(''); }} className="text-sm font-medium hover:underline" style={{ color: 'var(--color-accent)' }}>
              Limpiar filtros
            </button>
          )}
        </div>

        {showFilters && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Entidad</label>
                <select value={entidadFilter} onChange={e => setEntidadFilter(e.target.value as TipoEntidad | '')} className="form-input w-full">
                  <option value="">Todas las entidades</option>
                  {Object.entries(LABELS_ENTIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Acción</label>
                <select value={accionFilter} onChange={e => setAccionFilter(e.target.value as TipoAccion | '')} className="form-input w-full">
                  <option value="">Todas las acciones</option>
                  {Object.entries(LABELS_ACCION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de logs — usando table-container y table como el resto */}
      <div className="table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Descripción</th>
                <th>Usuario</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className="cursor-pointer" onClick={() => setSelectedLog(log)}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{formatDate(log.created_at)}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className={`badge ${accionBadgeClass(log.accion)}`}>
                      {LABELS_ACCION[log.accion] || log.accion}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {getEntityIcon(log.entidad)}
                      <span style={{ textTransform: 'capitalize' }}>{LABELS_ENTIDAD[log.entidad] || log.entidad}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: 400 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.descripcion || ''}>
                        {log.descripcion || '—'}
                      </div>
                      {log.entidad_nombre && (
                        <div className="text-sm" style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{log.entidad_nombre}</div>
                      )}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{log.user_email?.split('@')[0] || '—'}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <Eye className="w-4 h-4" style={{ color: 'var(--color-text-secondary)', display: 'inline' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <Activity className="w-12 h-12" style={{ margin: '0 auto 0.75rem', color: '#d1d5db' }} />
            <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No hay registros para el período seleccionado</p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {filtroRapido === 'hoy' ? 'Realiza alguna acción y aparecerá aquí, o selecciona otro período.' : 'Prueba ampliando el rango de fechas.'}
            </p>
          </div>
        )}

        {loading && logs.length > 0 && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Actualizando...</div>
          </div>
        )}
      </div>

      {/* Contador */}
      {filteredLogs.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Mostrando {filteredLogs.length} registro(s)
          </span>
        </div>
      )}

      {/* Modal de detalle */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" style={{ maxWidth: '32rem' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                Detalle del evento
              </h3>
              <button onClick={() => setSelectedLog(null)} style={{ color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className={`badge ${accionBadgeClass(selectedLog.accion)}`}>
                  {getActionIcon(selectedLog.accion)}
                  <span style={{ marginLeft: 4 }}>{LABELS_ACCION[selectedLog.accion] || selectedLog.accion}</span>
                </span>
                <span className="badge badge-gray">
                  {getEntityIcon(selectedLog.entidad)}
                  <span style={{ marginLeft: 4 }}>{LABELS_ENTIDAD[selectedLog.entidad] || selectedLog.entidad}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', marginBottom: 2 }}>Fecha</p>
                  <p className="text-sm font-medium">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', marginBottom: 2 }}>Usuario</p>
                  <p className="text-sm font-medium">{selectedLog.user_email || '—'}</p>
                </div>
              </div>

              {selectedLog.descripcion && (
                <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', marginBottom: 4 }}>Descripción</p>
                  <p className="text-sm">{selectedLog.descripcion}</p>
                </div>
              )}

              {selectedLog.entidad_nombre && (
                <div style={{ marginBottom: '1rem' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', marginBottom: 2 }}>Nombre</p>
                  <p className="text-sm font-medium">{selectedLog.entidad_nombre}</p>
                </div>
              )}

              {selectedLog.campo && (
                <div style={{ marginBottom: '1rem' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', marginBottom: 2 }}>Campo modificado</p>
                  <code style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem' }}>{selectedLog.campo}</code>
                </div>
              )}

              {(selectedLog.valor_anterior || selectedLog.valor_nuevo) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
                  {selectedLog.valor_anterior && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem' }}>
                      <p className="text-sm font-semibold" style={{ color: '#dc2626', fontSize: '0.7rem', marginBottom: 4 }}>VALOR ANTERIOR</p>
                      <p className="text-sm" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{selectedLog.valor_anterior}</p>
                    </div>
                  )}
                  {selectedLog.valor_nuevo && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem' }}>
                      <p className="text-sm font-semibold" style={{ color: '#16a34a', fontSize: '0.7rem', marginBottom: 4 }}>VALOR NUEVO</p>
                      <p className="text-sm" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{selectedLog.valor_nuevo}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedLog.entidad_id && (
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', marginBottom: 2 }}>ID del registro</p>
                  <code style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{selectedLog.entidad_id}</code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal SQL */}
      {showSetupSQL && (
        <div className="modal-overlay" onClick={() => setShowSetupSQL(false)}>
          <div className="modal-content" style={{ maxWidth: '40rem' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                SQL de configuración
              </h3>
              <button onClick={() => setShowSetupSQL(false)} style={{ color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>
                <p className="font-semibold text-sm" style={{ color: '#92400e' }}>Instrucciones:</p>
                <ol style={{ listStyleType: 'decimal', marginLeft: '1.25rem', marginTop: '0.5rem', color: '#92400e', fontSize: '0.875rem' }}>
                  <li>Abre tu <strong>Supabase Dashboard</strong> &rarr; <strong>SQL Editor</strong></li>
                  <li>Copia el código SQL de abajo</li>
                  <li>Ejecútalo (botón &quot;Run&quot;)</li>
                  <li>Vuelve aquí y pulsa &quot;Actualizar&quot;</li>
                </ol>
              </div>
              <div style={{ position: 'relative' }}>
                <button onClick={copySQL} className="btn btn-secondary" style={{ position: 'absolute', top: 8, right: 8, padding: '0.25rem 0.75rem', fontSize: '0.75rem', minHeight: 'auto' }}>
                  <Copy className="w-3 h-3" /> {copiedSQL ? 'Copiado!' : 'Copiar'}
                </button>
                <pre style={{ background: '#1e293b', color: '#4ade80', fontSize: '0.75rem', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', maxHeight: '50vh', whiteSpace: 'pre-wrap' }}>{SQL_MIGRATION}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

    </LayoutShell>
  );
}
