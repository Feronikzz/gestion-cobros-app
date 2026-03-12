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
import { Plus, FileText, DollarSign, Edit3, Trash2, Search, Filter } from 'lucide-react';

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

      return searchMatch && clienteMatch && metodoMatch && tipoMatch;
    });
  }, [cobros, searchTerm, filterCliente, filterMetodo, filterTipo]);

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

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
          {(searchTerm || filterCliente || filterMetodo || filterTipo) && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 ml-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>
      </div>

      {/* Contador de resultados */}
      {(searchTerm || filterCliente || filterMetodo || filterTipo) && (
        <div className="mb-4 text-sm text-gray-600">
          Mostrando {filteredCobros.length} de {cobros.length} cobros
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
