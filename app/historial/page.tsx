'use client';

import { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { useAudit } from '@/lib/hooks/use-audit';
import type { AuditFilter, AuditAction, EntityType } from '@/lib/supabase/audit-types';
import { 
  History, 
  Filter, 
  Search, 
  Download, 
  RefreshCw, 
  Calendar,
  User,
  Activity,
  RotateCcw,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  CreditCard,
  Receipt,
  TrendingUp,
  Archive
} from 'lucide-react';

export default function HistorialPage() {
  const { logs, stats, loading, error, fetchLogs, restoreEvent, exportLogs } = useAudit();
  
  const [filters, setFilters] = useState<AuditFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Apply filters
  const filteredLogs = useMemo(() => {
    let filtered = logs;
    
    if (filters.user_email) {
      filtered = filtered.filter(log => log.user_email === filters.user_email);
    }
    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }
    if (filters.entity_type) {
      filtered = filtered.filter(log => log.entity_type === filters.entity_type);
    }
    if (filters.search) {
      filtered = filtered.filter(log => 
        log.description?.toLowerCase().includes(filters.search!.toLowerCase()) ||
        log.entity_id?.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }
    
    return filtered;
  }, [logs, filters]);

  // Get unique values for filters
  const uniqueUsers = useMemo(() => {
    return [...new Set(logs.map(log => log.user_email).filter(Boolean))];
  }, [logs]);

  const handleFilterChange = (key: keyof AuditFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRestore = async (logId: string) => {
    if (!confirm('¿Estás seguro de que quieres restaurar este evento? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsRestoring(true);
    try {
      await restoreEvent(logId);
      alert('Evento restaurado exitosamente');
    } catch (err: any) {
      alert(`Error al restaurar: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportLogs(filters);
    } catch (err: any) {
      alert(`Error al exportar: ${err.message}`);
    }
  };

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'create': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'update': return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'delete': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'login': return <User className="w-4 h-4 text-purple-500" />;
      case 'logout': return <Archive className="w-4 h-4 text-gray-500" />;
      case 'view': return <Eye className="w-4 h-4 text-indigo-500" />;
      case 'export': return <Download className="w-4 h-4 text-orange-500" />;
      case 'restore': return <RotateCcw className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEntityIcon = (entityType: EntityType) => {
    switch (entityType) {
      case 'cliente': return <Users className="w-4 h-4" />;
      case 'cobro': return <CreditCard className="w-4 h-4" />;
      case 'gasto': return <Receipt className="w-4 h-4" />;
      case 'procedimiento': return <FileText className="w-4 h-4" />;
      case 'reparto': return <TrendingUp className="w-4 h-4" />;
      case 'factura': return <FileText className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="historial-page">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <History className="w-8 h-8 text-blue-600" />
              Historial de Auditoría
            </h1>
            <p className="text-gray-600 mt-2">
              Registro completo de todos los eventos y acciones del sistema
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => fetchLogs()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Eventos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_events.toLocaleString()}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.events_today}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Esta Semana</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.events_this_week}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Restauraciones</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.recent_restores}</p>
                </div>
                <RotateCcw className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
                <select
                  value={filters.user_email || ''}
                  onChange={(e) => handleFilterChange('user_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los usuarios</option>
                  {uniqueUsers.map(email => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Acción</label>
                <select
                  value={filters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las acciones</option>
                  <option value="create">Crear</option>
                  <option value="update">Actualizar</option>
                  <option value="delete">Eliminar</option>
                  <option value="login">Iniciar sesión</option>
                  <option value="logout">Cerrar sesión</option>
                  <option value="view">Ver</option>
                  <option value="export">Exportar</option>
                  <option value="restore">Restaurar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entidad</label>
                <select
                  value={filters.entity_type || ''}
                  onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las entidades</option>
                  <option value="cliente">Cliente</option>
                  <option value="cobro">Cobro</option>
                  <option value="gasto">Gasto</option>
                  <option value="procedimiento">Procedimiento</option>
                  <option value="reparto">Reparto</option>
                  <option value="factura">Factura</option>
                  <option value="documento">Documento</option>
                  <option value="nota">Nota</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Buscar en descripción o ID..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setFilters({})}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {log.user_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="capitalize">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {getEntityIcon(log.entity_type)}
                        <span className="capitalize">{log.entity_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={log.description}>
                        {log.description || '-'}
                      </div>
                      {log.entity_id && (
                        <div className="text-xs text-gray-500">
                          ID: {log.entity_id}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.restored_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          <RotateCcw className="w-3 h-3" />
                          Restaurado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {log.action === 'delete' && !log.restored_at && (
                          <button
                            onClick={() => handleRestore(log.id)}
                            disabled={isRestoring}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Restaurar"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron eventos con los filtros seleccionados</p>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Detalles del Evento</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha</label>
                      <p className="text-gray-900">{formatDate(selectedLog.created_at)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Usuario</label>
                      <p className="text-gray-900">{selectedLog.user_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Acción</label>
                      <div className="flex items-center gap-2">
                        {getActionIcon(selectedLog.action)}
                        <span className="capitalize">{selectedLog.action}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Entidad</label>
                      <div className="flex items-center gap-2">
                        {getEntityIcon(selectedLog.entity_type)}
                        <span className="capitalize">{selectedLog.entity_type}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedLog.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Descripción</label>
                      <p className="text-gray-900">{selectedLog.description}</p>
                    </div>
                  )}
                  
                  {selectedLog.entity_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ID de Entidad</label>
                      <p className="text-gray-900 font-mono">{selectedLog.entity_id}</p>
                    </div>
                  )}
                  
                  {selectedLog.old_values && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Valores Anteriores</label>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(selectedLog.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {selectedLog.new_values && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Valores Nuevos</label>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(selectedLog.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {selectedLog.ip_address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">IP Address</label>
                      <p className="text-gray-900 font-mono">{selectedLog.ip_address}</p>
                    </div>
                  )}
                  
                  {selectedLog.user_agent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User Agent</label>
                      <p className="text-gray-900 text-sm">{selectedLog.user_agent}</p>
                    </div>
                  )}
                  
                  {selectedLog.restored_at && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">
                        Este evento fue restaurado el {formatDate(selectedLog.restored_at)}
                      </p>
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
