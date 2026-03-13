'use client';

import React, { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { ClienteForm } from '@/components/cliente-form';
import { Modal } from '@/components/modal';
import { ResponsiveTable, MobileCard, MobileRow } from '@/components/table-responsive';
import { Skeleton, CardSkeleton, TableSkeleton } from '@/components/skeleton';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import { useCobros } from '@/lib/hooks/use-cobros';
import type { Cliente, ClienteInsert } from '@/lib/supabase/types';
import Link from 'next/link';
import { Eye, Edit, Trash2, UserPlus, Users, TrendingUp, Calendar, DollarSign, Search, ChevronDown, X, Phone, Mail, MapPin } from 'lucide-react';

export default function ClientesPageEnhanced() {
  const { clientes, loading, error, createCliente, updateCliente, deleteCliente } = useClientes();
  const { procedimientos, loading: procLoading } = useProcedimientos();
  const { cobros, loading: cobLoading } = useCobros();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [showEstadoFilter, setShowEstadoFilter] = useState(false);

  // Funciones de estadísticas
  const calcularClientesActivos = () => {
    return clientes.filter(c => c.estado === 'activo').length;
  };

  const calcularTotalPresupuesto = () => {
    return procedimientos.reduce((total, p) => total + p.presupuesto, 0);
  };

  const calcularTotalCobrado = () => {
    return cobros.reduce((total, c) => total + c.importe, 0);
  };

  const calcularClientesNuevosMes = () => {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth();
    const añoActual = fechaActual.getFullYear();
    
    return clientes.filter(c => {
      const fechaEntrada = new Date(c.fecha_entrada);
      return fechaEntrada.getMonth() === mesActual && fechaEntrada.getFullYear() === añoActual;
    }).length;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setEstadoFilter('');
    setShowEstadoFilter(false);
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter(cliente => {
      const matchesSearch = searchQuery === '' || 
        cliente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cliente.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cliente.telefono?.includes(searchQuery);
      
      const matchesEstado = estadoFilter === '' || cliente.estado === estadoFilter;
      
      return matchesSearch && matchesEstado;
    });
  }, [clientes, searchQuery, estadoFilter]);

  const activeFiltersCount = useMemo(() => [searchQuery, estadoFilter].filter(Boolean).length, [searchQuery, estadoFilter]);

  const handleSubmit = async (data: ClienteInsert) => {
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, data);
      } else {
        await createCliente(data);
      }
      setIsModalOpen(false);
      setEditingCliente(null);
    } catch (error) {
      console.error('Error saving cliente:', error);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      try {
        await deleteCliente(id);
      } catch (error) {
        console.error('Error deleting cliente:', error);
      }
    }
  };

  const isLoading = loading || procLoading || cobLoading;

  if (error) {
    return (
      <LayoutShell title="Clientes" description="Gestión de clientes del despacho">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600 text-center">
            <p className="text-lg font-semibold mb-2">Error al cargar los datos</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell 
      title="Clientes" 
      description="Gestión completa de clientes y su información de contacto"
    >
      {/* Stats Cards */}
      {isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Total Clientes</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{clientes.length}</p>
              </div>
              <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Activos</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{calcularClientesActivos()}</p>
              </div>
              <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Nuevos este mes</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{calcularClientesNuevosMes()}</p>
              </div>
              <Calendar className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-600">Total Cobrado</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{calcularTotalCobrado().toFixed(0)}€</p>
              </div>
              <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex-1 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative">
              <button
                onClick={() => setShowEstadoFilter(!showEstadoFilter)}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50"
              >
                <span>Estado: {estadoFilter || 'Todos'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showEstadoFilter && (
                <div className="absolute top-full mt-1 w-full sm:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => { setEstadoFilter(''); setShowEstadoFilter(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => { setEstadoFilter('activo'); setShowEstadoFilter(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Activo
                  </button>
                  <button
                    onClick={() => { setEstadoFilter('inactivo'); setShowEstadoFilter(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Inactivo
                  </button>
                </div>
              )}
            </div>
            
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Limpiar
              </button>
            )}
            
            <button
              onClick={() => {
                setEditingCliente(null);
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {filteredClientes.length} {filteredClientes.length === 1 ? 'cliente' : 'clientes'} encontrado{filteredClientes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table for Desktop, Cards for Mobile */}
      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <ResponsiveTable>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Entrada
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                          <div className="text-sm text-gray-500">{cliente.nif || '—'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {cliente.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {cliente.email}
                            </div>
                          )}
                          {cliente.telefono && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {cliente.telefono}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cliente.direccion && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {cliente.direccion}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          cliente.estado === 'activo' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {cliente.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(cliente.fecha_entrada).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/clientes/${cliente.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleEdit(cliente)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cliente.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredClientes.map((cliente) => (
              <MobileCard
                key={cliente.id}
                title={cliente.nombre}
                subtitle={cliente.nif || '—'}
                actions={
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="text-blue-600 hover:text-blue-900 p-1"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleEdit(cliente)}
                      className="text-indigo-600 hover:text-indigo-900 p-1"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                }
              >
                <MobileRow label="Email" value={cliente.email || '—'} />
                <MobileRow label="Teléfono" value={cliente.telefono || '—'} />
                <MobileRow label="Dirección" value={cliente.direccion || '—'} />
                <MobileRow 
                  label="Estado" 
                  value={
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      cliente.estado === 'activo' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cliente.estado}
                    </span>
                  } 
                />
                <MobileRow 
                  label="Fecha Entrada" 
                  value={new Date(cliente.fecha_entrada).toLocaleDateString()} 
                />
              </MobileCard>
            ))}
          </div>

          {filteredClientes.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron clientes</h3>
              <p className="text-gray-500">
                {searchQuery || estadoFilter 
                  ? 'Intenta ajustar los filtros de búsqueda' 
                  : 'Comienza agregando tu primer cliente'
                }
              </p>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCliente(null);
        }}
        title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
      >
        <ClienteForm
          cliente={editingCliente || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingCliente(null);
          }}
        />
      </Modal>
    </LayoutShell>
  );
}
