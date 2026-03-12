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
import { Plus, FileText, DollarSign, Edit3, Trash2, Search, Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

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
        <div className="flex items-center gap-3">
          {/* Desplegable de filtros */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                activeFiltersCount > 0 
                  ? 'border-blue-300 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Panel desplegable de filtros */}
            {showFilters && (
              <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  {/* Header del panel */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Búsqueda */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Cliente, notas o procedimiento..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="form-input pl-10"
                        />
                      </div>
                    </div>

                    {/* Filtro por cliente */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
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

                    {/* Filtro por método */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
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

                    {/* Filtro por tipo */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
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

                    {/* Filtro por mes */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mes</label>
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
              </div>
            )}
          </div>

          <button onClick={handleCreate} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Nuevo Cobro
          </button>
        </div>
      </div>

      {/* Contador de resultados */}
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
