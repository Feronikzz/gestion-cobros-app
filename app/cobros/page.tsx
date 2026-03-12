'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { CobroForm } from '@/components/cobro-form';
import { Modal } from '@/components/modal';
import { useCobros } from '@/lib/hooks/use-cobros';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import type { Cobro } from '@/lib/supabase/types';
import { eur } from '@/lib/utils';
import { Plus, FileText, DollarSign, Edit3, Trash2, Search, Filter, ChevronDown, ChevronUp, X, TrendingUp, Calendar, CreditCard, Users, ArrowUpRight, Sparkles } from 'lucide-react';

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

  // Estadísticas para el dashboard
  const stats = useMemo(() => {
    const total = cobros.reduce((sum, c) => sum + c.importe, 0);
    const entradas = cobros.filter(c => c.notas && c.notas.includes('Entrada')).reduce((sum, c) => sum + c.importe, 0);
    const normales = total - entradas;
    const esteMes = cobros.filter(c => c.fecha_cobro.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, c) => sum + c.importe, 0);
    
    return {
      total,
      entradas,
      normales,
      esteMes,
      count: cobros.length,
      entradasCount: cobros.filter(c => c.notas && c.notas.includes('Entrada')).length
    };
  }, [cobros]);

  // Animación de entrada
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Nav />
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando cobros...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Nav />
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Cobros</h1>
              <p className="mt-2 text-gray-600">Control financiero con análisis en tiempo real</p>
            </div>
            <button onClick={handleCreate} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cobro
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">+12.5%</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Recaudado</p>
              <p className="text-2xl font-bold text-gray-900">{eur(stats.total)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-blue-600 font-medium">+8.3%</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Este Mes</p>
              <p className="text-2xl font-bold text-gray-900">{eur(stats.esteMes)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tipos de Cobro</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Entradas</span>
                  <span className="font-medium text-purple-600">{eur(stats.entradas)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Normales</span>
                  <span className="font-medium text-gray-900">{eur(stats.normales)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-amber-600 font-medium">+15.2%</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Transacciones</p>
              <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-700">
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cliente, notas o procedimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
              <select
                value={filterCliente}
                onChange={(e) => setFilterCliente(e.target.value)}
                className="form-input"
              >
                <option value="">Todos los clientes</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Método</label>
              <select
                value={filterMetodo}
                onChange={(e) => setFilterMetodo(e.target.value)}
                className="form-input"
              >
                <option value="">Todos los métodos</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="bizum">Bizum</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="form-input"
              >
                <option value="">Todos los tipos</option>
                <option value="normal">Normal</option>
                <option value="entrada">Entrada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
              <select
                value={filterMes}
                onChange={(e) => setFilterMes(e.target.value)}
                className="form-input"
              >
                <option value="">Todos los meses</option>
                {mesesDisponibles.map(mes => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resultados */}
        {activeFiltersCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                Mostrando <span className="font-bold">{filteredCobros.length}</span> de <span className="font-bold">{cobros.length}</span> cobros
              </span>
              <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-700">
                Limpiar
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
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
                      <div className="flex flex-col items-center gap-4">
                        <Search className="w-8 h-8 text-gray-400" />
                        <p className="text-lg font-medium text-gray-700">
                          {cobros.length === 0 ? 'No hay cobros registrados' : 'No hay cobros que coincidan con los filtros'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {cobros.length === 0 ? 'Comienza agregando tu primer cobro' : 'Intenta ajustar los filtros para ver más resultados'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCobros.map((cobro) => (
                    <tr key={cobro.id} className="hover:bg-gray-50">
                      <td>{cobro.fecha_cobro}</td>
                      <td>
                        <button
                          onClick={() => handleClienteClick(cobro.cliente_id)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
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
        </div>
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
    </div>
  );
}
