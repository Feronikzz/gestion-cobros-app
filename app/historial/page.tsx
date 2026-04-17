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
              <span className="text-sm font-medium text-gray-600">Período:</span>
              {(['hoy', 'ayer', 'semana', 'mes'] as FiltroRapido[]).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroRapido(tipo)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filtroRapido === tipo
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Día específico
              </button>
            </div>
            
            {filtroRapido === 'personalizado' && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Fecha:</label>
                <input
                  type="date"
                  value={fechaPersonalizada}
                  min={minFecha}
                  max={hoy}
                  onChange={(e) => setFechaPersonalizada(e.target.value)}
                  className="form-input text-sm"
                />
                <span className="text-xs text-gray-400">(máx. 1 mes atrás)</span>
              </div>
            )}
          </div>
        </div>

        {/* Filtros avanzados */}
        {showFilters && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6">
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                  className="text-sm text-blue-600 hover:underline"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resumen estadístico */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total eventos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Creados</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.porAccion.get('crear') || 0}
                </p>
              </div>
              <Plus className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Actualizados</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.porAccion.get('actualizar') || 0}
                </p>
              </div>
              <Pencil className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Eliminados</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.porAccion.get('eliminar') || 0}
                </p>
              </div>
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Tabla de logs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha y hora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log, idx) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedLog(log);
                      setShowDetailModal(true);
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {log.user_email?.split('@')[0]}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getActionIcon(log.accion)}
                        <span className="text-sm text-gray-700 capitalize">{log.accion}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getEntityIcon(log.entidad)}
                        <span className="text-sm text-gray-700 capitalize">{log.entidad}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="max-w-md truncate" title={log.descripcion || ''}>
                        {log.descripcion || '-'}
                      </div>
                      {log.entidad_nombre && (
                        <div className="text-xs text-gray-500">
                          {log.entidad_nombre}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Eye className="w-4 h-4 text-gray-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay registros para el período seleccionado</p>
              {filtroRapido === 'hoy' && (
                <p className="text-sm text-gray-400 mt-1">Prueba seleccionando "Este mes" o "Esta semana"</p>
              )}
            </div>
          )}
          
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando historial...</p>
            </div>
          )}
        </div>

        {/* Modal de detalle */}
        {showDetailModal && selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    Detalle del evento
                  </h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Fecha:</span>
                      <p className="font-medium">{formatDate(selectedLog.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Usuario:</span>
                      <p className="font-medium">{selectedLog.user_email}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                      {getActionIcon(selectedLog.accion)}
                      <span className="text-sm font-medium capitalize">{selectedLog.accion}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                      {getEntityIcon(selectedLog.entidad)}
                      <span className="text-sm font-medium capitalize">{selectedLog.entidad}</span>
                    </div>
                  </div>
                  
                  {selectedLog.entidad_nombre && (
                    <div>
                      <span className="text-gray-500 text-sm">Nombre:</span>
                      <p className="font-medium">{selectedLog.entidad_nombre}</p>
                    </div>
                  )}
                  
                  {selectedLog.descripcion && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="text-gray-500 text-sm">Descripción:</span>
                      <p className="text-gray-900 mt-1">{selectedLog.descripcion}</p>
                    </div>
                  )}
                  
                  {selectedLog.campo && (
                    <div>
                      <span className="text-gray-500 text-sm">Campo modificado:</span>
                      <p className="font-medium">{selectedLog.campo}</p>
                    </div>
                  )}
                  
                  {(selectedLog.valor_anterior || selectedLog.valor_nuevo) && (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedLog.valor_anterior && (
                        <div className="bg-red-50 p-3 rounded-lg">
                          <span className="text-red-600 text-xs font-medium">Valor anterior</span>
                          <p className="text-sm text-gray-900 mt-1 break-all">{selectedLog.valor_anterior}</p>
                        </div>
                      )}
                      {selectedLog.valor_nuevo && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <span className="text-green-600 text-xs font-medium">Valor nuevo</span>
                          <p className="text-sm text-gray-900 mt-1 break-all">{selectedLog.valor_nuevo}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedLog.entidad_id && (
                    <div>
                      <span className="text-gray-500 text-sm">ID:</span>
                      <p className="font-mono text-xs text-gray-600">{selectedLog.entidad_id}</p>
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
