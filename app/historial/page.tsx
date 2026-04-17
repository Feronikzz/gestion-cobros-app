'use client';

import { useState, useEffect, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { getAuditLog, type FiltrosAudit } from '@/lib/audit';
import type { AuditLog, TipoEntidad, TipoAccion } from '@/lib/supabase/types';
import { 
  History, 
  Filter, 
  Search, 
  Download, 
  RefreshCw, 
  Calendar,
  User,
  Activity,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  CreditCard,
  Receipt,
  TrendingUp,
  Archive,
  Plus,
  Pencil,
  Trash2,
  FileUp,
  FileMinus,
  Send,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

type FiltroRapido = 'hoy' | 'ayer' | 'semana' | 'mes' | 'personalizado';

export default function HistorialPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtro rápido de fecha (por defecto HOY)
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapido>('hoy');
  const [fechaPersonalizada, setFechaPersonalizada] = useState<string>('');
  
  // Filtros adicionales
  const [entidadFilter, setEntidadFilter] = useState<TipoEntidad | ''>('');
  const [accionFilter, setAccionFilter] = useState<TipoAccion | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal de detalle
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Calcular fechas según filtro rápido
  const calcularFechas = (): { desde: string; hasta: string } => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    switch (filtroRapido) {
      case 'hoy': {
        const finHoy = new Date(hoy);
        finHoy.setHours(23, 59, 59, 999);
        return { desde: hoy.toISOString(), hasta: finHoy.toISOString() };
      }
      case 'ayer': {
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);
        const finAyer = new Date(ayer);
        finAyer.setHours(23, 59, 59, 999);
        return { desde: ayer.toISOString(), hasta: finAyer.toISOString() };
      }
      case 'semana': {
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        finSemana.setHours(23, 59, 59, 999);
        return { desde: inicioSemana.toISOString(), hasta: finSemana.toISOString() };
      }
      case 'mes': {
        const inicioMes = new Date(hoy);
        inicioMes.setDate(1);
        const finMes = new Date(hoy);
        finMes.setHours(23, 59, 59, 999);
        return { desde: inicioMes.toISOString(), hasta: finMes.toISOString() };
      }
      case 'personalizado': {
        if (fechaPersonalizada) {
          const fecha = new Date(fechaPersonalizada);
          fecha.setHours(0, 0, 0, 0);
          const finFecha = new Date(fecha);
          finFecha.setHours(23, 59, 59, 999);
          return { desde: fecha.toISOString(), hasta: finFecha.toISOString() };
        }
        // Por defecto últimos 30 días
        const hace30 = new Date(hoy);
        hace30.setDate(hace30.getDate() - 30);
        return { desde: hace30.toISOString(), hasta: new Date().toISOString() };
      }
      default:
        return { desde: hoy.toISOString(), hasta: new Date().toISOString() };
    }
  };

  // Cargar logs
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { desde, hasta } = calcularFechas();
      const filtros: FiltrosAudit = {
        fechaDesde: desde,
        fechaHasta: hasta,
        entidad: entidadFilter || undefined,
        accion: accionFilter || undefined,
        limit: 1000,
      };
      
      const data = await getAuditLog(filtros);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filtroRapido, fechaPersonalizada, entidadFilter, accionFilter]);

  // Filtrar por búsqueda de texto
  const filteredLogs = useMemo(() => {
    if (!busqueda) return logs;
    const search = busqueda.toLowerCase();
    return logs.filter(log => 
      log.descripcion?.toLowerCase().includes(search) ||
      log.entidad_nombre?.toLowerCase().includes(search) ||
      log.entidad_id?.toLowerCase().includes(search)
    );
  }, [logs, busqueda]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const porEntidad = new Map<string, number>();
    const porAccion = new Map<string, number>();
    
    filteredLogs.forEach(log => {
      porEntidad.set(log.entidad, (porEntidad.get(log.entidad) || 0) + 1);
      porAccion.set(log.accion, (porAccion.get(log.accion) || 0) + 1);
    });
    
    return { total, porEntidad, porAccion };
  }, [filteredLogs]);

  const getActionIcon = (accion: TipoAccion) => {
    switch (accion) {
      case 'crear': return <Plus className="w-4 h-4 text-green-500" />;
      case 'actualizar': return <Pencil className="w-4 h-4 text-blue-500" />;
      case 'eliminar': return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'adjuntar': return <FileUp className="w-4 h-4 text-purple-500" />;
      case 'desadjuntar': return <FileMinus className="w-4 h-4 text-orange-500" />;
      case 'presentar': return <Send className="w-4 h-4 text-indigo-500" />;
      case 'resolver': return <CheckSquare className="w-4 h-4 text-teal-500" />;
      case 'generar': return <FileText className="w-4 h-4 text-cyan-500" />;
      case 'exportar': return <Download className="w-4 h-4 text-amber-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEntityIcon = (entidad: TipoEntidad) => {
    switch (entidad) {
      case 'cliente': return <Users className="w-4 h-4" />;
      case 'cobro': return <CreditCard className="w-4 h-4" />;
      case 'gasto': return <Receipt className="w-4 h-4" />;
      case 'procedimiento': return <FileText className="w-4 h-4" />;
      case 'factura': return <Receipt className="w-4 h-4" />;
      case 'documento': return <Archive className="w-4 h-4" />;
      case 'recibi': return <CreditCard className="w-4 h-4" />;
      case 'actividad': return <Activity className="w-4 h-4" />;
      case 'catalogo': return <FileText className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFechaLabel = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleExport = () => {
    const dataToExport = filteredLogs.map(log => ({
      Fecha: formatDate(log.created_at),
      Usuario: log.user_email,
      Acción: log.accion,
      Entidad: log.entidad,
      Nombre: log.entidad_nombre,
      Descripción: log.descripcion,
      'ID Entidad': log.entidad_id,
    }));
    
    const csv = [
      Object.keys(dataToExport[0] || {}).join(','),
      ...dataToExport.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calcular fecha máxima (hoy) y mínima (hace 1 mes)
  const hoy = new Date().toISOString().split('T')[0];
  const hace1Mes = new Date();
  hace1Mes.setMonth(hace1Mes.getMonth() - 1);
  const minFecha = hace1Mes.toISOString().split('T')[0];

  return (
    <LayoutShell title="Historial de Actividad">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-7 h-7 text-blue-600" />
              Historial de Actividad
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Registro completo de todos los cambios realizados en la aplicación
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
              {(entidadFilter || accionFilter) && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="btn btn-primary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Filtros de fecha rápidos */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Período:</span>
              {(['hoy', 'ayer', 'semana', 'mes'] as FiltroRapido[]).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroRapido(tipo)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filtroRapido === tipo
                      ? 'text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  style={filtroRapido === tipo ? { background: 'var(--color-accent)' } : { background: 'var(--color-surface-elevated)', color: 'var(--color-text-primary)' }}
                >
                  {tipo === 'hoy' && 'Hoy'}
                  {tipo === 'ayer' && 'Ayer'}
                  {tipo === 'semana' && 'Esta semana'}
                  {tipo === 'mes' && 'Este mes'}
                </button>
              ))}
              <button
                onClick={() => setFiltroRapido('personalizado')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  filtroRapido === 'personalizado'
                    ? 'text-white'
                    : 'hover:bg-gray-100'
                }`}
                style={filtroRapido === 'personalizado' ? { background: 'var(--color-accent)' } : { background: 'var(--color-surface-elevated)', color: 'var(--color-text-primary)' }}
              >
                <Calendar className="w-4 h-4" />
                Día específico
              </button>
            </div>
            
            {filtroRapido === 'personalizado' && (
              <div className="flex items-center gap-2">
                <label className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Fecha:</label>
                <input
                  type="date"
                  value={fechaPersonalizada}
                  min={minFecha}
                  max={hoy}
                  onChange={(e) => setFechaPersonalizada(e.target.value)}
                  className="form-input text-sm w-auto"
                />
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>(máx. 1 mes atrás)</span>
              </div>
            )}
          </div>
        </div>

        {/* Filtros avanzados */}
        {showFilters && (
          <div className="rounded-xl border p-4 mb-6" style={{ background: 'rgba(180,83,9,0.06)', borderColor: 'rgba(180,83,9,0.2)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-sm">Entidad</label>
                <select
                  value={entidadFilter}
                  onChange={(e) => setEntidadFilter(e.target.value as TipoEntidad | '')}
                  className="form-input w-full text-sm"
                >
                  <option value="">Todas las entidades</option>
                  <option value="cliente">Cliente</option>
                  <option value="procedimiento">Expediente/Procedimiento</option>
                  <option value="cobro">Cobro</option>
                  <option value="gasto">Gasto</option>
                  <option value="documento">Documento</option>
                  <option value="factura">Factura</option>
                  <option value="recibi">Recibí</option>
                  <option value="actividad">Actividad</option>
                  <option value="catalogo">Catálogo</option>
                </select>
              </div>
              <div>
                <label className="form-label text-sm">Acción</label>
                <select
                  value={accionFilter}
                  onChange={(e) => setAccionFilter(e.target.value as TipoAccion | '')}
                  className="form-input w-full text-sm"
                >
                  <option value="">Todas las acciones</option>
                  <option value="crear">Crear</option>
                  <option value="actualizar">Actualizar</option>
                  <option value="eliminar">Eliminar</option>
                  <option value="adjuntar">Adjuntar documento</option>
                  <option value="desadjuntar">Desadjuntar documento</option>
                  <option value="presentar">Presentar</option>
                  <option value="resolver">Resolver</option>
                </select>
              </div>
              <div>
                <label className="form-label text-sm">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Descripción, nombre o ID..."
                    className="form-input w-full pl-9 text-sm"
                  />
                </div>
              </div>
            </div>
            {(entidadFilter || accionFilter || busqueda) && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => {
                    setEntidadFilter('');
                    setAccionFilter('');
                    setBusqueda('');
                  }}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resumen estadístico */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>Total eventos</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{stats.total}</p>
              </div>
              <Activity className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
            </div>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>Creados</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.porAccion.get('crear') || 0}
                </p>
              </div>
              <Plus className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>Actualizados</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.porAccion.get('actualizar') || 0}
                </p>
              </div>
              <Pencil className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>Eliminados</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.porAccion.get('eliminar') || 0}
                </p>
              </div>
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Tabla de logs */}
        <div className="table-container">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Descripción</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr 
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedLog(log);
                      setShowDetailModal(true);
                    }}
                  >
                    <td className="whitespace-nowrap">
                      <span style={{ color: 'var(--color-text-secondary)' }}>{formatDate(log.created_at)}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} />
                        <span>{log.user_email?.split('@')[0]}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getActionIcon(log.accion)}
                        <span className="capitalize">{log.accion}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getEntityIcon(log.entidad)}
                        <span className="capitalize">{log.entidad}</span>
                      </div>
                    </td>
                    <td>
                      <div className="max-w-md truncate" title={log.descripcion || ''}>
                        {log.descripcion || '-'}
                      </div>
                      {log.entidad_nombre && (
                        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {log.entidad_nombre}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <Eye className="w-4 h-4 inline" style={{ color: 'var(--color-text-tertiary)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>No hay registros para el período seleccionado</p>
              {filtroRapido === 'hoy' && (
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Prueba seleccionando "Este mes" o "Esta semana"</p>
              )}
            </div>
          )}
          
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--color-accent)' }}></div>
              <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>Cargando historial...</p>
            </div>
          )}
        </div>

        {/* Modal de detalle */}
        {showDetailModal && selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" style={{ background: 'var(--color-surface)' }}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <History className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                    Detalle del evento
                  </h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Fecha:</span>
                      <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Usuario:</span>
                      <p className="font-medium">{selectedLog.user_email}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface-elevated)' }}>
                      {getActionIcon(selectedLog.accion)}
                      <span className="text-sm font-medium capitalize">{selectedLog.accion}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface-elevated)' }}>
                      {getEntityIcon(selectedLog.entidad)}
                      <span className="text-sm font-medium capitalize">{selectedLog.entidad}</span>
                    </div>
                  </div>
                  
                  {selectedLog.entidad_nombre && (
                    <div>
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Nombre:</span>
                      <p className="font-medium">{selectedLog.entidad_nombre}</p>
                    </div>
                  )}
                  
                  {selectedLog.descripcion && (
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(180,83,9,0.06)' }}>
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Descripción:</span>
                      <p className="mt-1" style={{ color: 'var(--color-text-primary)' }}>{selectedLog.descripcion}</p>
                    </div>
                  )}
                  
                  {selectedLog.campo && (
                    <div>
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Campo modificado:</span>
                      <p className="font-medium">{selectedLog.campo}</p>
                    </div>
                  )}
                  
                  {(selectedLog.valor_anterior || selectedLog.valor_nuevo) && (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedLog.valor_anterior && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                          <span className="text-xs font-medium text-red-600">Valor anterior</span>
                          <p className="text-sm mt-1 break-all" style={{ color: 'var(--color-text-primary)' }}>{selectedLog.valor_anterior}</p>
                        </div>
                      )}
                      {selectedLog.valor_nuevo && (
                        <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                          <span className="text-xs font-medium text-green-600">Valor nuevo</span>
                          <p className="text-sm mt-1 break-all" style={{ color: 'var(--color-text-primary)' }}>{selectedLog.valor_nuevo}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedLog.entidad_id && (
                    <div>
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>ID:</span>
                      <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{selectedLog.entidad_id}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
