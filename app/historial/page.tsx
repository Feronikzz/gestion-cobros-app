'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { getAuditLog, type FiltrosAudit } from '@/lib/audit';
import type { AuditLog, TipoEntidad, TipoAccion } from '@/lib/supabase/types';
import { 
  History, Filter, Search, Download, RefreshCw, Calendar,
  User, Activity, Eye, AlertCircle, CheckCircle, FileText,
  Users, CreditCard, Receipt, Archive, Plus, Pencil, Trash2,
  FileUp, FileMinus, Send, CheckSquare, X, Wrench, ShieldAlert,
  Loader2, Database, Copy
} from 'lucide-react';

type FiltroRapido = 'hoy' | 'ayer' | 'semana' | 'mes' | 'todo';

const LABELS_FILTRO: Record<FiltroRapido, string> = {
  hoy: 'Hoy',
  ayer: 'Ayer',
  semana: 'Esta semana',
  mes: 'Este mes',
  todo: 'Todo (30 días)',
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

const ACTION_COLORS: Record<string, string> = {
  crear: 'bg-green-100 text-green-800 border-green-200',
  actualizar: 'bg-blue-100 text-blue-800 border-blue-200',
  eliminar: 'bg-red-100 text-red-800 border-red-200',
  adjuntar: 'bg-purple-100 text-purple-800 border-purple-200',
  desadjuntar: 'bg-orange-100 text-orange-800 border-orange-200',
  presentar: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  resolver: 'bg-teal-100 text-teal-800 border-teal-200',
  generar: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  exportar: 'bg-amber-100 text-amber-800 border-amber-200',
};

// ── SQL para crear tabla (mostrar al usuario si falta) ──
const SQL_MIGRATION = `-- Ejecutar en Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS audit_log (
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

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_date ON audit_log(user_id, created_at);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_usuario ON audit_log;
DROP POLICY IF EXISTS audit_log_select ON audit_log;
DROP POLICY IF EXISTS audit_log_insert ON audit_log;

CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());`;

export default function HistorialPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>('mes');
  const [entidadFilter, setEntidadFilter] = useState<TipoEntidad | ''>('');
  const [accionFilter, setAccionFilter] = useState<TipoAccion | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Diagnóstico
  const [diagStatus, setDiagStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [diagResult, setDiagResult] = useState<any>(null);
  const [showSetupSQL, setShowSetupSQL] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);

  const calcularFechas = useCallback((): { desde: string; hasta: string } => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(); fin.setHours(23, 59, 59, 999);

    switch (filtroRapido) {
      case 'hoy':
        return { desde: hoy.toISOString(), hasta: fin.toISOString() };
      case 'ayer': {
        const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
        const finAyer = new Date(ayer); finAyer.setHours(23, 59, 59, 999);
        return { desde: ayer.toISOString(), hasta: finAyer.toISOString() };
      }
      case 'semana': {
        const inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - hoy.getDay() + 1);
        return { desde: inicio.toISOString(), hasta: fin.toISOString() };
      }
      case 'mes': {
        const inicio = new Date(hoy); inicio.setDate(1);
        return { desde: inicio.toISOString(), hasta: fin.toISOString() };
      }
      case 'todo': {
        const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30);
        return { desde: hace30.toISOString(), hasta: fin.toISOString() };
      }
    }
  }, [filtroRapido]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { desde, hasta } = calcularFechas();
      const data = await getAuditLog({
        fechaDesde: desde,
        fechaHasta: hasta,
        entidad: entidadFilter || undefined,
        accion: accionFilter || undefined,
        limit: 1000,
      });
      setLogs(data);
      if (data.length === 0 && diagStatus === 'idle') {
        runDiagnostic();
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial');
      if (diagStatus === 'idle') runDiagnostic();
    } finally {
      setLoading(false);
    }
  }, [calcularFechas, entidadFilter, accionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Diagnóstico automático ──
  const runDiagnostic = async () => {
    setDiagStatus('checking');
    try {
      const res = await fetch('/api/audit-check');
      const data = await res.json();
      setDiagResult(data);
      setDiagStatus(data.ok ? 'ok' : 'error');
      if (data.ok) {
        // Si el test fue bien, recargar logs
        setTimeout(() => fetchLogs(), 500);
      }
    } catch {
      setDiagStatus('error');
      setDiagResult({ ok: false, error: 'No se pudo conectar con el diagnóstico' });
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_MIGRATION);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  // Filtrar por búsqueda
  const filteredLogs = useMemo(() => {
    if (!busqueda) return logs;
    const s = busqueda.toLowerCase();
    return logs.filter(log =>
      log.descripcion?.toLowerCase().includes(s) ||
      log.entidad_nombre?.toLowerCase().includes(s) ||
      log.entidad_id?.toLowerCase().includes(s) ||
      log.accion?.toLowerCase().includes(s) ||
      log.entidad?.toLowerCase().includes(s)
    );
  }, [logs, busqueda]);

  // Estadísticas
  const stats = useMemo(() => {
    const porAccion = new Map<string, number>();
    filteredLogs.forEach(log => porAccion.set(log.accion, (porAccion.get(log.accion) || 0) + 1));
    return { total: filteredLogs.length, porAccion };
  }, [filteredLogs]);

  const getActionIcon = (accion: string) => {
    switch (accion) {
      case 'crear': return <Plus className="w-3.5 h-3.5" />;
      case 'actualizar': return <Pencil className="w-3.5 h-3.5" />;
      case 'eliminar': return <Trash2 className="w-3.5 h-3.5" />;
      case 'adjuntar': return <FileUp className="w-3.5 h-3.5" />;
      case 'desadjuntar': return <FileMinus className="w-3.5 h-3.5" />;
      case 'presentar': return <Send className="w-3.5 h-3.5" />;
      case 'resolver': return <CheckSquare className="w-3.5 h-3.5" />;
      case 'generar': return <FileText className="w-3.5 h-3.5" />;
      case 'exportar': return <Download className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getEntityIcon = (entidad: string) => {
    switch (entidad) {
      case 'cliente': return <Users className="w-4 h-4 text-blue-500" />;
      case 'cobro': return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'gasto': return <Receipt className="w-4 h-4 text-red-500" />;
      case 'procedimiento': return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'factura': return <Receipt className="w-4 h-4 text-amber-500" />;
      case 'documento': return <Archive className="w-4 h-4 text-purple-500" />;
      case 'recibi': return <CreditCard className="w-4 h-4 text-teal-500" />;
      case 'actividad': return <Activity className="w-4 h-4 text-cyan-500" />;
      case 'catalogo': return <FileText className="w-4 h-4 text-gray-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    const rows = filteredLogs.map(log => ({
      Fecha: formatDate(log.created_at),
      Usuario: log.user_email,
      Accion: log.accion,
      Entidad: log.entidad,
      Nombre: log.entidad_nombre,
      Descripcion: log.descripcion,
      Campo: log.campo,
      'Valor Anterior': log.valor_anterior,
      'Valor Nuevo': log.valor_nuevo,
    }));
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `historial-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <LayoutShell title="Historial de Actividad">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-6 h-6 text-blue-600" />
              Historial de Actividad
            </h1>
            <p className="text-gray-500 text-sm">Control de todas las acciones realizadas en la aplicación</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} disabled={filteredLogs.length === 0} className="btn btn-secondary btn-sm flex items-center gap-1.5 disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => { setDiagStatus('idle'); fetchLogs(); }} disabled={loading} className="btn btn-primary btn-sm flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>
        </div>

        {/* ── Banner de diagnóstico / error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Error al cargar historial</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                {diagStatus === 'error' && diagResult && (
                  <div className="mt-2 text-sm text-red-700 bg-red-100 rounded p-2">
                    <p><strong>Diagnóstico:</strong> {diagResult.fix || diagResult.error}</p>
                    {diagResult.step === 'select' && <p className="mt-1">La tabla <code className="bg-red-200 px-1 rounded">audit_log</code> no existe en Supabase.</p>}
                    {diagResult.step === 'insert' && <p className="mt-1">La tabla existe pero las políticas RLS bloquean las inserciones.</p>}
                  </div>
                )}
                <button onClick={() => setShowSetupSQL(true)} className="mt-3 btn btn-sm bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Ver SQL de configuración
                </button>
              </div>
            </div>
          </div>
        )}

        {diagStatus === 'checking' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando tabla audit_log en Supabase...
          </div>
        )}

        {diagStatus === 'ok' && !error && logs.length === 0 && !loading && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" /> Tabla audit_log verificada ({diagResult?.totalRecords || 0} registros). Las acciones futuras se registrarán aquí.
          </div>
        )}

        {diagStatus === 'error' && !error && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">La tabla de historial no está configurada</p>
                <p className="text-sm text-amber-600 mt-1">
                  {diagResult?.fix || 'Necesitas ejecutar el SQL de configuración en Supabase para activar el historial de cambios.'}
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setShowSetupSQL(true)} className="btn btn-sm bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> Ver SQL de configuración
                  </button>
                  <button onClick={runDiagnostic} className="btn btn-sm btn-secondary flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" /> Re-verificar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filtros de período ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-500 mr-1">Período:</span>
            {(Object.keys(LABELS_FILTRO) as FiltroRapido[]).map(tipo => (
              <button
                key={tipo}
                onClick={() => setFiltroRapido(tipo)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filtroRapido === tipo
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {LABELS_FILTRO[tipo]}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                <Filter className="w-4 h-4" />
              </button>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar..."
                  className="form-input text-sm pl-8 w-40 lg:w-56"
                />
              </div>
            </div>
          </div>

          {/* Filtros expandibles */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Entidad</label>
                <select value={entidadFilter} onChange={e => setEntidadFilter(e.target.value as TipoEntidad | '')} className="form-input text-sm w-auto">
                  <option value="">Todas</option>
                  {Object.entries(LABELS_ENTIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Acción</label>
                <select value={accionFilter} onChange={e => setAccionFilter(e.target.value as TipoAccion | '')} className="form-input text-sm w-auto">
                  <option value="">Todas</option>
                  {Object.entries(LABELS_ACCION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {(entidadFilter || accionFilter) && (
                <button onClick={() => { setEntidadFilter(''); setAccionFilter(''); }} className="text-xs text-blue-600 hover:underline pb-2">Limpiar</button>
              )}
            </div>
          )}
        </div>

        {/* ── Stats rápidas ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: <Activity className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50' },
            { label: 'Creados', value: stats.porAccion.get('crear') || 0, icon: <Plus className="w-5 h-5 text-green-500" />, bg: 'bg-green-50' },
            { label: 'Actualizados', value: stats.porAccion.get('actualizar') || 0, icon: <Pencil className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50' },
            { label: 'Eliminados', value: stats.porAccion.get('eliminar') || 0, icon: <Trash2 className="w-5 h-5 text-red-500" />, bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 flex items-center justify-between`}>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
              {s.icon}
            </div>
          ))}
        </div>

        {/* ── Lista de eventos (cards en lugar de tabla) ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando historial...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Activity className="w-12 h-12 mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">Sin registros en este período</p>
              <p className="text-sm text-gray-400 mt-1">
                {filtroRapido === 'hoy' ? 'Realiza alguna acción y aparecerá aquí, o selecciona otro período.' : 'Prueba ampliando el rango de fechas.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLogs.map(log => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors group"
                >
                  {/* Icono entidad */}
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    {getEntityIcon(log.entidad)}
                  </div>
                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${ACTION_COLORS[log.accion] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {getActionIcon(log.accion)}
                        {LABELS_ACCION[log.accion] || log.accion}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{LABELS_ENTIDAD[log.entidad] || log.entidad}</span>
                    </div>
                    <p className="text-sm text-gray-800 mt-0.5 truncate">{log.descripcion || log.entidad_nombre || '—'}</p>
                    {log.campo && <p className="text-xs text-gray-400 mt-0.5">Campo: {log.campo}</p>}
                  </div>
                  {/* Hora */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-400">{formatTime(log.created_at)}</p>
                    <p className="text-[10px] text-gray-300">{new Date(log.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                  </div>
                  <Eye className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contador */}
        {filteredLogs.length > 0 && (
          <p className="text-xs text-gray-400 text-center">{filteredLogs.length} registro(s) encontrados</p>
        )}

        {/* ── Modal de detalle ── */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 flex items-center justify-between px-5 py-3 bg-gray-50 border-b rounded-t-xl">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" /> Detalle del evento
                </h2>
                <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border ${ACTION_COLORS[selectedLog.accion] || ''}`}>
                    {getActionIcon(selectedLog.accion)}
                    {LABELS_ACCION[selectedLog.accion] || selectedLog.accion}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    {getEntityIcon(selectedLog.entidad)}
                    {LABELS_ENTIDAD[selectedLog.entidad] || selectedLog.entidad}
                  </span>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Fecha</p>
                    <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Usuario</p>
                    <p className="font-medium">{selectedLog.user_email || '—'}</p>
                  </div>
                </div>

                {/* Descripción */}
                {selectedLog.descripcion && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase mb-1">Descripción</p>
                    <p className="text-sm text-gray-800">{selectedLog.descripcion}</p>
                  </div>
                )}

                {/* Nombre entidad */}
                {selectedLog.entidad_nombre && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Nombre</p>
                    <p className="text-sm font-medium">{selectedLog.entidad_nombre}</p>
                  </div>
                )}

                {/* Campo modificado */}
                {selectedLog.campo && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Campo modificado</p>
                    <p className="text-sm font-medium font-mono bg-gray-100 px-2 py-1 rounded inline-block">{selectedLog.campo}</p>
                  </div>
                )}

                {/* Valores anterior / nuevo */}
                {(selectedLog.valor_anterior || selectedLog.valor_nuevo) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedLog.valor_anterior && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-600 mb-1">Valor anterior</p>
                        <p className="text-sm text-gray-800 break-all whitespace-pre-wrap">{selectedLog.valor_anterior}</p>
                      </div>
                    )}
                    {selectedLog.valor_nuevo && (
                      <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-green-600 mb-1">Valor nuevo</p>
                        <p className="text-sm text-gray-800 break-all whitespace-pre-wrap">{selectedLog.valor_nuevo}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ID */}
                {selectedLog.entidad_id && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase">ID del registro</p>
                    <p className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">{selectedLog.entidad_id}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal SQL de configuración ── */}
        {showSetupSQL && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSetupSQL(false)}>
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 flex items-center justify-between px-5 py-3 bg-gray-50 border-b rounded-t-xl">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" /> SQL de configuración
                </h2>
                <button onClick={() => setShowSetupSQL(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-medium">Instrucciones:</p>
                  <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>Abre tu <strong>Supabase Dashboard</strong> &rarr; <strong>SQL Editor</strong></li>
                    <li>Copia el código SQL de abajo</li>
                    <li>Ejecútalo (botón &quot;Run&quot;)</li>
                    <li>Vuelve aquí y pulsa &quot;Actualizar&quot;</li>
                  </ol>
                </div>
                <div className="relative">
                  <button onClick={copySQL} className="absolute top-2 right-2 btn btn-sm btn-secondary flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5" /> {copiedSQL ? 'Copiado!' : 'Copiar'}
                  </button>
                  <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto max-h-[50vh] whitespace-pre-wrap">{SQL_MIGRATION}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </LayoutShell>
  );
}
