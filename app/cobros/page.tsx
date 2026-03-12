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
import { Plus, FileText, DollarSign, Edit3, Trash2, Search, Filter, ChevronDown, ChevronUp, X, Users, CreditCard, Calendar } from 'lucide-react';

export default function CobrosPage() {
  const router = useRouter();
  const { cobros, loading, error, createCobro, updateCobro, deleteCobro } = useCobros();
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
  const [showFilters, setShowFilters] = useState(false);
  const [showMonthFilter, setShowMonthFilter] = useState(false);

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

      return searchMatch && clienteMatch && metodoMatch && tipoMatch && mesMatch;
    });
  }, [cobros, searchTerm, filterCliente, filterMetodo, filterTipo, filterMes]);

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
  const activeFiltersCount = [searchTerm, filterCliente, filterMetodo, filterTipo, filterMes].filter(Boolean).length;

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
  };

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
    return cliente?.nombre || 'Cliente desconocido';
  };

  const getProcedimientoTitulo = (procedimientoId: string) => {
    const procedimiento = procedimientos.find(p => p.id === procedimientoId);
    return procedimiento?.titulo || 'Procedimiento desconocido';
  };

  const isEntrada = (cobro: Cobro) => {
    return cobro.notas?.includes('Entrada del procedimiento:') || cobro.procedimiento_id !== null;
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
    <LayoutShell title="Cobros">
      <div className="page-toolbar">
        <h2>Gestión de Cobros</h2>
        <button onClick={handleCreate} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Cobro
        </button>
      </div>

      {/* Búsqueda Principal */}
      <div className="mb-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Buscar cobros por cliente, notas o procedimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3.5 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtros Visuales Modernos */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Filtros inteligentes</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Cliente */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`group px-4 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  filterCliente 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg ${
                    filterCliente ? 'bg-white/20' : 'bg-blue-100'
                  }`}>
                    <Users className={`w-4 h-4 ${filterCliente ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <span>{filterCliente ? getClienteNombre(filterCliente) : 'Cliente'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {showFilters && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                    <div className="text-white font-medium text-sm">Seleccionar cliente</div>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {clientes.map(cliente => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setFilterCliente(filterCliente === cliente.id ? '' : cliente.id);
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                          filterCliente === cliente.id 
                            ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-500' 
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

            {/* Filtro de Método */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'transferencia', label: 'Transferencia', color: 'green' },
                { value: 'efectivo', label: 'Efectivo', color: 'emerald' },
                { value: 'tarjeta', label: 'Tarjeta', color: 'blue' },
                { value: 'bizum', label: 'Bizum', color: 'purple' }
              ].map(metodo => (
                <button
                  key={metodo.value}
                  onClick={() => setFilterMetodo(filterMetodo === metodo.value ? '' : metodo.value)}
                  className={`group px-4 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    filterMetodo === metodo.value 
                      ? `bg-gradient-to-r from-${metodo.color}-500 to-${metodo.color}-600 text-white shadow-lg shadow-${metodo.color}-500/25` 
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg ${
                      filterMetodo === metodo.value ? 'bg-white/20' : `bg-${metodo.color}-100`
                    }`}>
                      <CreditCard className={`w-4 h-4 ${
                        filterMetodo === metodo.value ? 'text-white' : `text-${metodo.color}-600`
                      }`} />
                    </div>
                    <span>{metodo.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Filtro de Tipo */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTipo(filterTipo === 'entrada' ? '' : 'entrada')}
                className={`group px-4 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  filterTipo === 'entrada' 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25' 
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-amber-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg ${
                    filterTipo === 'entrada' ? 'bg-white/20' : 'bg-amber-100'
                  }`}>
                    <DollarSign className={`w-4 h-4 ${filterTipo === 'entrada' ? 'text-white' : 'text-amber-600'}`} />
                  </div>
                  <span>Entrada</span>
                </div>
              </button>
              <button
                onClick={() => setFilterTipo(filterTipo === 'normal' ? '' : 'normal')}
                className={`group px-4 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  filterTipo === 'normal' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg ${
                    filterTipo === 'normal' ? 'bg-white/20' : 'bg-purple-100'
                  }`}>
                    <FileText className={`w-4 h-4 ${filterTipo === 'normal' ? 'text-white' : 'text-purple-600'}`} />
                  </div>
                  <span>Normal</span>
                </div>
              </button>
            </div>

            {/* Filtro de Mes */}
            <div className="relative">
              <button
                onClick={() => setShowMonthFilter(!showMonthFilter)}
                className={`group px-4 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  filterMes 
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg ${
                    filterMes ? 'bg-white/20' : 'bg-indigo-100'
                  }`}>
                    <Calendar className={`w-4 h-4 ${filterMes ? 'text-white' : 'text-indigo-600'}`} />
                  </div>
                  <span>{filterMes ? mesesDisponibles.find(m => m.value === filterMes)?.label || 'Mes' : 'Mes'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showMonthFilter ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {showMonthFilter && (
                <div className="absolute top-full left-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3">
                    <div className="text-white font-medium text-sm">Seleccionar mes</div>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {mesesDisponibles.map(mes => (
                      <button
                        key={mes.value}
                        onClick={() => {
                          setFilterMes(filterMes === mes.value ? '' : mes.value);
                          setShowMonthFilter(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                          filterMes === mes.value 
                            ? 'bg-indigo-50 text-indigo-700 font-medium border-l-4 border-indigo-500' 
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

            {/* Botón Limpiar */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="group px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white/20 rounded-lg">
                    <X className="w-4 h-4 text-white" />
                  </div>
                  <span>Limpiar ({activeFiltersCount})</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="mb-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="font-medium">Filtros activos:</span> {activeFiltersCount} | 
          <span className="ml-2">Mostrando {filteredCobros.length} de {cobros.length} cobros</span>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Procedimiento</th>
              <th>Método</th>
              <th>Importe</th>
              <th>Notas</th>
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
              filteredCobros.map((cobro) => (
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
                    {isEntrada(cobro) ? (
                      <span className="badge badge-amber">
                        <DollarSign className="w-3 h-3 mr-1" />
                        Entrada
                      </span>
                    ) : (
                      <span className="badge badge-gray">Normal</span>
                    )}
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
                  <td>
                    <div className="flex items-center gap-1">
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
        </table>
      </div>

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
