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
  Eye
} from 'lucide-react';

export default function ExpedientesPage() {
  const router = useRouter();
  const { expedientes, loading, error, stats, filtrarPorEstado, filtrarPorCliente, filtrarPorPagado } = useExpedientes();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [pagadoFilter, setPagadoFilter] = useState('todos');

  // Aplicar filtros
  const filteredExpedientes = useMemo(() => {
    let filtered = expedientes;
    
    // Filtro de búsqueda
    if (searchTerm.trim()) {
      filtered = filtrarPorCliente(searchTerm);
    }
    
    // Filtro de estado
    filtered = filtrarPorEstado(estadoFilter);
    
    // Filtro de pagado
    filtered = filtrarPorPagado(pagadoFilter);
    
    return filtered;
  }, [expedientes, searchTerm, estadoFilter, pagadoFilter, filtrarPorEstado, filtrarPorCliente, filtrarPorPagado]);

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
        <div className="metric-card metric-blue">
          <FileText className="metric-icon" />
          <div>
            <p className="metric-label">Total expedientes</p>
            <p className="metric-value">{stats.total}</p>
          </div>
        </div>
        <div className="metric-card metric-orange">
          <Clock className="metric-icon" />
          <div>
            <p className="metric-label">En proceso</p>
            <p className="metric-value">{stats.enProceso}</p>
          </div>
        </div>
        <div className="metric-card metric-green">
          <CheckCircle className="metric-icon" />
          <div>
            <p className="metric-label">Resueltos</p>
            <p className="metric-value">{stats.resueltos}</p>
          </div>
        </div>
        <div className="metric-card metric-purple">
          <DollarSign className="metric-icon" />
          <div>
            <p className="metric-label">Presupuesto total</p>
            <p className="metric-value">{eur(stats.presupuestoTotal)}</p>
          </div>
        </div>
        <div className="metric-card metric-red">
          <AlertCircle className="metric-icon" />
          <div>
            <p className="metric-label">Pendiente de pago</p>
            <p className="metric-value">{eur(stats.pendienteTotal)}</p>
          </div>
        </div>
        <div className="metric-card metric-green">
          <TrendingUp className="metric-icon" />
          <div>
            <p className="metric-label">Cobrado total</p>
            <p className="metric-value">{eur(stats.cobradoTotal)}</p>
          </div>
        </div>
      </div>

      {/* ─── Filtros ── */}
      <div className="page-toolbar">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="form-input search-select"
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
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <select
              value={pagadoFilter}
              onChange={(e) => setPagadoFilter(e.target.value)}
              className="form-input search-select"
            >
              <option value="todos">Todos los pagos</option>
              <option value="pagados">Pagados totalmente</option>
              <option value="pendientes">Con pago pendiente</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Tabla de Expedientes ── */}
      <div className="data-table-container">
        <table className="data-table">
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

      {/* ─── Resumen de filtros ── */}
      {filteredExpedientes.length !== expedientes.length && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Filter className="w-4 h-4" />
            <span className="text-sm">
              Mostrando {filteredExpedientes.length} de {expedientes.length} expedientes
            </span>
          </div>
        </div>
      )}
    </LayoutShell>
  );
}
