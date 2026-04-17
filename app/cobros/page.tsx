'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutShell } from '@/components/layout-shell';
import { CobroForm } from '@/components/cobro-form';
import { Modal } from '@/components/modal';
import { useCobros } from '@/lib/hooks/use-cobros';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import type { Cobro } from '@/lib/supabase/types';
import { eur } from '@/lib/utils';
import { useHideSensitive } from '@/lib/hooks/use-hide-sensitive';
import { SensitiveToggle } from '@/components/sensitive-toggle';
import { CheckCircle, AlertCircle, Plus, FileText, DollarSign, Edit3, Trash2, Search, Filter, ChevronDown, ChevronUp, X, Users, CreditCard, Calendar, TrendingUp, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CobrosPage() {
  const router = useRouter();
  const { cobros, loading, error, createCobro, updateCobro, deleteCobro } = useCobros();
  const { hidden: hideSensitive, toggle: toggleSensitive, mask } = useHideSensitive();
  const { clientes } = useClientes();
  const { procedimientos } = useProcedimientos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCobro, setEditingCobro] = useState<Cobro | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [showMetodoFilter, setShowMetodoFilter] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Filtrado de cobros
  const filteredCobros = useMemo(() => {
    return cobros.filter(cobro => {
      // Búsqueda por texto
      const searchMatch = !searchTerm || 
        getClienteNombre(cobro.cliente_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cobro.notas && cobro.notas.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (cobro.procedimiento_id && getProcedimientoTitulo(cobro.procedimiento_id).toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por cliente
      const clienteMatch = !filterCliente || cobro.cliente_id === filterCliente;

      // Filtro por método
      const metodoMatch = !filterMetodo || cobro.metodo_pago === filterMetodo;

      // Filtro por tipo (entrada/normal)
      const tipoMatch = !filterTipo || 
        (filterTipo === 'entrada' && isEntrada(cobro)) ||
        (filterTipo === 'normal' && !isEntrada(cobro));

      // Filtro por mes
      const mesMatch = !filterMes || cobro.fecha_cobro.startsWith(filterMes);

      // Filtro por rango de fechas (desde/hasta)
      const fechaCobro = new Date(cobro.fecha_cobro);
      const desdeMatch = !filterFechaDesde || fechaCobro >= new Date(filterFechaDesde);
      const hastaMatch = !filterFechaHasta || fechaCobro <= new Date(filterFechaHasta + 'T23:59:59');

      return searchMatch && clienteMatch && metodoMatch && tipoMatch && mesMatch && desdeMatch && hastaMatch;
    });
  }, [cobros, searchTerm, filterCliente, filterMetodo, filterTipo, filterMes, filterFechaDesde, filterFechaHasta]);

  // Calcular total de cobros filtrados
  const totalCobradoFiltrado = useMemo(() => {
    return filteredCobros.reduce((total, cobro) => total + cobro.importe, 0);
  }, [filteredCobros]);

  // Cobros paginados
  const paginatedCobros = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCobros.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCobros, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCobros.length / itemsPerPage) || 1;

  // Generar meses disponibles para el filtro
  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    cobros.forEach(cobro => {
      const mes = cobro.fecha_cobro.slice(0, 7); // YYYY-MM
      meses.add(mes);
    });
    
    return Array.from(meses).sort((a, b) => b.localeCompare(a)).map(mes => {
      const [year, month] = mes.split('-');
      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return {
        value: mes,
        label: `${monthNames[parseInt(month) - 1]} ${year}`
      };
    });
  }, [cobros]);

  // Contar filtros activos
  const activeFiltersCount = [searchTerm, filterCliente, filterMetodo, filterTipo, filterMes, filterFechaDesde, filterFechaHasta].filter(Boolean).length;

  const handleCreate = () => {
    setEditingCobro(null);
    setIsModalOpen(true);
  };

  const handleClienteClick = (clienteId: string) => {
    router.push(`/clientes/${clienteId}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCliente('');
    setFilterMetodo('');
    setFilterTipo('');
    setFilterMes('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    setCurrentPage(1);
  };

  // Reset página al cambiar filtros
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCliente, filterMetodo, filterTipo, filterMes, filterFechaDesde, filterFechaHasta]);

  const handleEdit = (cobro: Cobro) => {
    setEditingCobro(cobro);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Cobro, 'id' | 'user_id' | 'created_at'>) => {
    try {
      if (editingCobro) {
        await updateCobro(editingCobro.id, data);
      } else {
        await createCobro(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (cobro: Cobro) => {
    const cliente = clientes.find(c => c.id === cobro.cliente_id);
    if (window.confirm(`¿Estás seguro de eliminar este cobro de ${cliente?.nombre || 'cliente'}?`)) {
      try {
        await deleteCobro(cobro.id);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const getClienteNombre = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : 'Cliente desconocido';
  };

  const getProcedimientoTitulo = (procedimientoId: string) => {
    const procedimiento = procedimientos.find(p => p.id === procedimientoId);
    return procedimiento ? procedimiento.titulo : 'Procedimiento desconocido';
  };

  // Funciones de estadísticas
  const calcularCobradoMesActual = () => {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth();
    const añoActual = fechaActual.getFullYear();
    
    return cobros
      .filter(cobro => {
        const fechaCobro = new Date(cobro.fecha_cobro);
        return fechaCobro.getMonth() === mesActual && fechaCobro.getFullYear() === añoActual;
      })
      .reduce((total, cobro) => total + cobro.importe, 0);
  };

  const calcularPendiente = () => {
    // Calcular pendiente basado en procedimientos activos
    let totalPendiente = 0;
    
    procedimientos.forEach(procedimiento => {
      // Solo considerar procedimientos que no estén cerrados/archivados
      if (!['cerrado', 'archivado'].includes(procedimiento.estado)) {
        // Calcular lo que se espera cobrar de este procedimiento
        const presupuestoTotal = procedimiento.presupuesto || 0;
        
        // Buscar cobros asociados a este procedimiento
        const cobrosDelProcedimiento = cobros.filter(cobro => cobro.procedimiento_id === procedimiento.id);
        const totalCobradoDelProcedimiento = cobrosDelProcedimiento.reduce((total, cobro) => total + cobro.importe, 0);
        
        // Calcular pendiente para este procedimiento
        const pendienteProcedimiento = presupuestoTotal - totalCobradoDelProcedimiento;
        
        // Añadir al total pendiente si es positivo
        if (pendienteProcedimiento > 0) {
          totalPendiente += pendienteProcedimiento;
        }
      }
    });
    
    return totalPendiente;
  };

  const isEntrada = (cobro: Cobro) => {
    return cobro.notas?.includes('Entrada del procedimiento:') || cobro.procedimiento_id !== null;
  };

  const isProcedimientoPagadoCompletamente = (procedimientoId: string) => {
    const procedimiento = procedimientos.find(p => p.id === procedimientoId);
    if (!procedimiento) return false;
    
    const cobrosDelProcedimiento = cobros.filter(cobro => cobro.procedimiento_id === procedimientoId);
    const totalCobrado = cobrosDelProcedimiento.reduce((total, cobro) => total + cobro.importe, 0);
    
    return totalCobrado >= procedimiento.presupuesto;
  };

  const handleCreateFacturaFromCobro = (cobro: Cobro) => {
    const cliente = clientes.find(c => c.id === cobro.cliente_id);
    if (!cliente) return;
    
    // Redirigir a página de facturas con parámetros prellenados
    const params = new URLSearchParams({
      cliente_id: cobro.cliente_id,
      cliente_nombre: cliente.nombre,
      cliente_nif: cliente.nif || '',
      cliente_direccion: cliente.direccion || '',
      importe: cobro.importe.toString(),
      concepto: cobro.notas || 'Cobro sin concepto específico',
      fecha: cobro.fecha_cobro,
      iva_tipo: cobro.iva_tipo,
      iva_porcentaje: cobro.iva_porcentaje.toString(),
      cobro_id: cobro.id,
    });
    
    window.open(`/facturas?${params.toString()}`, '_blank');
  };

  if (loading) {
    return (
      <LayoutShell title="Cobros">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando cobros...</div>
        </div>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell title="Cobros">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell 
      title="Cobros" 
      description="Registra y gestiona todos los cobros de tus clientes. Controla métodos de pago, fechas y seguimiento de ingresos."
    >
      <div className="page-toolbar">
        <h2>Gestión de Cobros</h2>
        <button onClick={handleCreate} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Cobro
        </button>
      </div>

      {/* Estadísticas */}
      <div className="dashboard-metrics" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 'var(--space-lg)' }}>
        <div className="metric-card metric-green">
          <DollarSign className="metric-icon" />
          <div>
            <p className="metric-label">Cobrado este mes</p>
            <p className="metric-value">{mask(eur(calcularCobradoMesActual()))}</p>
          </div>
        </div>
        <div className="metric-card metric-amber">
          <FileText className="metric-icon" />
          <div>
            <p className="metric-label">Pendiente de cobro</p>
            <p className="metric-value">{mask(eur(calcularPendiente()))}</p>
          </div>
        </div>
        <div className="metric-card metric-blue">
          <CreditCard className="metric-icon" />
          <div>
            <p className="metric-label">Total registros</p>
            <p className="metric-value">{cobros.length}</p>
          </div>
        </div>
        <SensitiveToggle hidden={hideSensitive} onToggle={toggleSensitive} className="absolute top-2 right-2" />
      </div>

      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        {/* Búsqueda Principal */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cobros por cliente, notas o procedimiento..."
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
          {/* Filtro de Cliente */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                filterCliente 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{filterCliente ? getClienteNombre(filterCliente) : 'Cliente'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showFilters && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 max-h-64 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-2">Seleccionar cliente</div>
                  {clientes.map(cliente => (
                    <button
                      key={cliente.id}
                      onClick={() => {
                        setFilterCliente(filterCliente === cliente.id ? '' : cliente.id);
                        setShowFilters(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        filterCliente === cliente.id 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {cliente.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filtro de Mes */}
          <div className="relative">
            <button
              onClick={() => setShowMonthFilter(!showMonthFilter)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                filterMes 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{filterMes ? mesesDisponibles.find(m => m.value === filterMes)?.label || 'Mes' : 'Mes'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showMonthFilter ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showMonthFilter && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 max-h-64 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-2">Seleccionar mes</div>
                  {mesesDisponibles.map(mes => (
                    <button
                      key={mes.value}
                      onClick={() => {
                        setFilterMes(filterMes === mes.value ? '' : mes.value);
                        setShowMonthFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        filterMes === mes.value 
                          ? 'bg-indigo-50 text-indigo-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {mes.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filtro de Rango de Fechas */}
          <div className="relative">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                (filterFechaDesde || filterFechaHasta)
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {(filterFechaDesde || filterFechaHasta) 
                    ? `${filterFechaDesde || '...'} - ${filterFechaHasta || '...'}` 
                    : 'Rango fechas'}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showDateFilter ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showDateFilter && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4 space-y-3">
                  <div className="text-xs font-medium text-gray-500">Rango de fechas</div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Desde</label>
                    <input
                      type="date"
                      value={filterFechaDesde}
                      onChange={(e) => {
                        setFilterFechaDesde(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Hasta</label>
                    <input
                      type="date"
                      value={filterFechaHasta}
                      onChange={(e) => {
                        setFilterFechaHasta(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setFilterFechaDesde('');
                        setFilterFechaHasta('');
                        setShowDateFilter(false);
                      }}
                      className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Limpiar
                    </button>
                    <button
                      onClick={() => setShowDateFilter(false)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filtro de Método de Pago Agrupado */}
          <div className="relative">
            <button
              onClick={() => setShowMetodoFilter(!showMetodoFilter)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                filterMetodo 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>{filterMetodo ? filterMetodo.charAt(0).toUpperCase() + filterMetodo.slice(1) : 'Método'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showMetodoFilter ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showMetodoFilter && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Seleccionar método</div>
                  {['transferencia', 'efectivo', 'tarjeta', 'bizum'].map(metodo => (
                    <button
                      key={metodo}
                      onClick={() => {
                        setFilterMetodo(filterMetodo === metodo ? '' : metodo);
                        setShowMetodoFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        filterMetodo === metodo 
                          ? 'bg-green-50 text-green-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span className="capitalize">{metodo}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botón Limpiar */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg border-2 border-red-300 bg-red-50 text-red-700 font-medium hover:bg-red-100 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <X className="w-4 h-4" />
                <span>Limpiar ({activeFiltersCount})</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="mb-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="font-medium">Filtros activos:</span> {activeFiltersCount} | 
          <span className="ml-2">Mostrando {filteredCobros.length} de {cobros.length} cobros</span>
        </div>
      )}

      {/* Info de paginación */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredCobros.length)}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCobros.length)}</span> de <span className="font-medium">{filteredCobros.length}</span> cobros
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Por página:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Procedimiento</th>
              <th>Método</th>
              <th>Importe</th>
              <th>Notas</th>
              <th>Pago completo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCobros.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  {cobros.length === 0 ? 'No hay cobros registrados' : 'No hay cobros que coincidan con los filtros'}
                </td>
              </tr>
            ) : (
              paginatedCobros.map((cobro) => (
                <tr key={cobro.id}>
                  <td>{cobro.fecha_cobro}</td>
                  <td>
                    <button
                      onClick={() => handleClienteClick(cobro.cliente_id)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      title="Ver detalles del cliente"
                    >
                      {getClienteNombre(cobro.cliente_id)}
                    </button>
                  </td>
                  <td>
                    {cobro.procedimiento_id ? (
                      <span className="badge badge-purple">
                        <FileText className="w-3 h-3 mr-1" />
                        {getProcedimientoTitulo(cobro.procedimiento_id)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-blue">{cobro.metodo_pago}</span>
                  </td>
                  <td className="font-medium text-green-600">{eur(cobro.importe)}</td>
                  <td className="text-sm text-gray-600 max-w-xs truncate" title={cobro.notas || ''}>
                    {cobro.notas || '-'}
                  </td>
                  <td className="text-center">
                    {cobro.procedimiento_id ? (
                      isProcedimientoPagadoCompletamente(cobro.procedimiento_id) ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Sí</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">No</span>
                        </div>
                      )
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {cobro.procedimiento_id && (
                        <button
                          onClick={() => router.push(`/expedientes`)}
                          className="action-btn action-view"
                          title="Ver expedientes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCreateFacturaFromCobro(cobro)}
                        className="action-btn action-view"
                        title="Crear factura"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(cobro)}
                        className="action-btn action-edit"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cobro)}
                        className="action-btn action-delete"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          
          {/* Fila de totales */}
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td colSpan={3} className="py-3 px-4 text-right font-medium text-gray-700">
                {filteredCobros.length > 0 && (
                  <span className="text-sm">
                    Total de {filteredCobros.length} cobro{filteredCobros.length !== 1 ? 's' : ''}:
                  </span>
                )}
              </td>
              <td className="py-3 px-4">
                {filteredCobros.length > 0 && (
                  <span className="text-lg font-bold text-green-600">
                    {eur(totalCobradoFiltrado)}
                  </span>
                )}
              </td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCobro ? 'Editar Cobro' : 'Nuevo Cobro'}
      >
        <CobroForm
          cobro={editingCobro || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </LayoutShell>
  );
}
