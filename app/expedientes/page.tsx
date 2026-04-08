'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutShell } from '@/components/layout-shell';
import { useExpedientes } from '@/lib/hooks/use-expedientes';
import { eur } from '@/lib/utils';
import type { EstadoProcedimiento } from '@/lib/supabase/types';
import { 
  FileText, 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Archive,
  DollarSign,
  Users,
  Eye,
  X
} from 'lucide-react';

export default function ExpedientesPage() {
  const router = useRouter();
  const { expedientes, loading, error, stats, filtrarPorEstado, filtrarPorCliente, filtrarPorPagado } = useExpedientes();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [pagadoFilter, setPagadoFilter] = useState('todos');

  // Aplicar filtros
  const filteredExpedientes = useMemo(() => {
    return expedientes.filter(expediente => {
      // Búsqueda por texto (cliente, título, concepto, referencia)
      const searchMatch = !searchTerm || 
        expediente.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expediente.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expediente.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expediente.expediente_referencia && expediente.expediente_referencia.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de estado
      const estadoMatch = estadoFilter === 'todos' || expediente.estado === estadoFilter;
      
      // Filtro de pagado
      const pagadoMatch = pagadoFilter === 'todos' || 
        (pagadoFilter === 'pagados' && expediente.esta_pagado_totalmente) ||
        (pagadoFilter === 'pendientes' && !expediente.esta_pagado_totalmente);

      return searchMatch && estadoMatch && pagadoMatch;
    });
  }, [expedientes, searchTerm, estadoFilter, pagadoFilter]);

  // Estado labels y badges
  const estadoLabels: Record<EstadoProcedimiento, string> = {
    pendiente: 'Pendiente',
    pendiente_presentar: 'Pte. presentar',
    presentado: 'Presentado',
    pendiente_resolucion: 'Pte. resolución',
    pendiente_recurso: 'Pte. recurso',
    resuelto: 'Resuelto',
    cerrado: 'Cerrado',
    archivado: 'Archivado',
  };

  const estadoBadges: Record<EstadoProcedimiento, string> = {
    pendiente: 'badge-orange',
    pendiente_presentar: 'badge-yellow',
    presentado: 'badge-blue',
    pendiente_resolucion: 'badge-yellow',
    pendiente_recurso: 'badge-red',
    resuelto: 'badge-green',
    cerrado: 'badge-gray',
    archivado: 'badge-gray',
  };

  if (loading) return <LayoutShell title="Expedientes"><div className="loading-state">Cargando expedientes...</div></LayoutShell>;
  if (error) return <LayoutShell title="Expedientes"><div className="error-state">Error: {error}</div></LayoutShell>;

  return (
    <LayoutShell 
      title="Expedientes" 
      description="Gestiona todos tus expedientes y procedimientos. Visualiza el estado de cada caso, seguimiento de pagos y acceso rápido a los detalles."
    >
      {/* ─── Métricas ── */}
      <div className="dashboard-metrics">
        <div className="metric-card metric-orange">
          <Clock className="metric-icon" />
          <div>
            <p className="metric-label">En proceso</p>
            <p className="metric-value">{stats.enProceso}</p>
          </div>
        </div>
        <div className="metric-card metric-green">
          <TrendingUp className="metric-icon" />
          <div>
            <p className="metric-label">Cobrado total</p>
            <p className="metric-value">{eur(stats.cobradoTotal)}</p>
          </div>
        </div>
        <div className="metric-card metric-red">
          <AlertCircle className="metric-icon" />
          <div>
            <p className="metric-label">Pendiente de pago</p>
            <p className="metric-value">{eur(stats.pendienteTotal)}</p>
          </div>
        </div>
        <div className="metric-card metric-purple">
          <DollarSign className="metric-icon" />
          <div>
            <p className="metric-label">Presupuesto total</p>
            <p className="metric-value">{eur(stats.presupuestoTotal)}</p>
          </div>
        </div>
      </div>

      {/* ─── Búsqueda y Filtros ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        {/* Búsqueda Principal */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar expedientes por cliente, título, concepto o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro de Estado */}
          <div className="relative">
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 appearance-none bg-white pr-10 ${
                estadoFilter !== 'todos'
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pendiente_presentar">Pte. presentar</option>
              <option value="presentado">Presentado</option>
              <option value="pendiente_resolucion">Pte. resolución</option>
              <option value="pendiente_recurso">Pte. recurso</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
              <option value="archivado">Archivado</option>
            </select>
            <Filter className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Filtro de Pago */}
          <div className="relative">
            <select
              value={pagadoFilter}
              onChange={(e) => setPagadoFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 appearance-none bg-white pr-10 ${
                pagadoFilter !== 'todos'
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <option value="todos">Todos los pagos</option>
              <option value="pagados">Pagados totalmente</option>
              <option value="pendientes">Con pago pendiente</option>
            </select>
            <DollarSign className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Contador de filtros activos */}
          {(estadoFilter !== 'todos' || pagadoFilter !== 'todos' || searchTerm) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                {[
                  estadoFilter !== 'todos' && `Estado: ${estadoLabels[estadoFilter as EstadoProcedimiento]}`,
                  pagadoFilter !== 'todos' && (pagadoFilter === 'pagados' ? 'Pagados' : 'Pendientes de pago'),
                  searchTerm && 'Búsqueda activa'
                ].filter(Boolean).join(' • ')}
              </span>
            </div>
          )}

          {/* Botón limpiar filtros */}
          {(estadoFilter !== 'todos' || pagadoFilter !== 'todos' || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setEstadoFilter('todos');
                setPagadoFilter('todos');
              }}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ─── Tabla de Expedientes ── */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Expediente</th>
              <th>Fecha presentación</th>
              <th>Estado</th>
              <th>Presupuesto</th>
              <th>Cobrado</th>
              <th>Pendiente</th>
              <th>Pago completo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpedientes.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">
                  No se encontraron expedientes con los filtros seleccionados
                </td>
              </tr>
            ) : (
              filteredExpedientes.map((expediente) => (
                <tr key={expediente.id} className="hover:bg-gray-50">
                  <td>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{expediente.cliente.nombre}</div>
                        <div className="text-sm text-gray-500">{expediente.cliente.nif || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="font-medium">{expediente.titulo}</div>
                      <div className="text-sm text-gray-500">{expediente.concepto}</div>
                      {expediente.expediente_referencia && (
                        <div className="text-xs text-gray-400">Ref: {expediente.expediente_referencia}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    {expediente.fecha_presentacion ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {expediente.fecha_presentacion}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${estadoBadges[expediente.estado]}`}>
                      {estadoLabels[expediente.estado]}
                    </span>
                  </td>
                  <td className="text-right font-medium">
                    {eur(expediente.presupuesto)}
                  </td>
                  <td className="text-right">
                    <span className={expediente.total_cobrado > 0 ? 'text-green-600' : 'text-gray-500'}>
                      {eur(expediente.total_cobrado)}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={expediente.total_pendiente > 0 ? 'text-red-600' : 'text-green-600'}>
                      {eur(expediente.total_pendiente)}
                    </span>
                  </td>
                  <td className="text-center">
                    {expediente.esta_pagado_totalmente ? (
                      <div className="flex items-center justify-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Sí</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">No</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/clientes/${expediente.cliente.id}`)}
                        className="btn btn-sm btn-secondary"
                        title="Ver detalles del cliente"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Resumen de resultados ── */}
      {filteredExpedientes.length !== expedientes.length && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">
              Mostrando {filteredExpedientes.length} de {expedientes.length} expedientes
            </span>
          </div>
        </div>
      )}
    </LayoutShell>
  );
}
