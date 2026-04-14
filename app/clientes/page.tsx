'use client';

import React, { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { ClienteFormV2 } from '@/components/cliente-form-v2';
import { Modal } from '@/components/modal';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import { useCobros } from '@/lib/hooks/use-cobros';
import type { Cliente, ClienteInsert, EstadoProcedimiento } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Eye, Edit, Trash2, UserPlus, Users, TrendingUp, Calendar, DollarSign, Search, ChevronDown, X } from 'lucide-react';

export default function ClientesPage() {
  const { clientes, loading, error, createCliente, updateCliente, deleteCliente } = useClientes();
  const { procedimientos } = useProcedimientos();
  const { cobros } = useCobros();
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

  const activeFiltersCount = [searchQuery, estadoFilter].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery('');
    setEstadoFilter('');
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.apellidos?.toLowerCase().includes(q) ||
        c.nif?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.notas?.toLowerCase().includes(q);
      const matchesEstado = !estadoFilter || c.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [clientes, searchQuery, estadoFilter]);

  const handleSubmit = async (
    data: Omit<ClienteInsert, 'user_id'>,
    docs: { tipo: string; numero: string; fecha_expedicion: string; fecha_caducidad: string; es_principal: boolean }[],
    proc: { titulo: string; concepto: string; presupuesto: number; tiene_entrada: boolean; importe_entrada: number; estado: EstadoProcedimiento } | null
  ) => {
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, data);
      } else {
        const newCliente = await createCliente(data);
        // Si se creó un procedimiento junto al cliente
        if (proc && newCliente) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: newProc } = await supabase.from('procedimientos').insert({
              ...proc,
              cliente_id: newCliente.id,
              user_id: user.id,
              nie_interesado: null,
              nombre_interesado: null,
              expediente_referencia: null,
              fecha_presentacion: null,
              fecha_resolucion: null,
              notas: null,
            }).select().single();
            // Si tiene entrada, crear cobro automático
            if (newProc && proc.tiene_entrada && proc.importe_entrada > 0) {
              await supabase.from('cobros').insert({
                user_id: user.id,
                cliente_id: newCliente.id,
                procedimiento_id: newProc.id,
                fecha_cobro: new Date().toISOString().slice(0, 10),
                importe: proc.importe_entrada,
                metodo_pago: 'efectivo',
                notas: `Entrada del procedimiento: ${proc.titulo}`,
                iva_tipo: 'iva_incluido',
                iva_porcentaje: 21,
              });
            }
          }
        }
        // Guardar documentos de identidad
        if (docs.length > 0 && newCliente) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('documentos_identidad').insert(
              docs.filter(d => d.numero).map(d => ({
                user_id: user.id,
                cliente_id: newCliente.id,
                tipo: d.tipo,
                numero: d.numero,
                fecha_expedicion: d.fecha_expedicion || null,
                fecha_caducidad: d.fecha_caducidad || null,
                es_principal: d.es_principal,
                notas: null,
              }))
            );
          }
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDelete = async (c: Cliente) => {
    if (window.confirm(`¿Eliminar a ${c.nombre}?`)) {
      try { await deleteCliente(c.id); } catch (err) { console.error(err); }
    }
  };

  const estadoBadge = (estado: string) => {
    const map: Record<string, string> = {
      activo: 'badge-green',
      pendiente: 'badge-yellow',
      pagado: 'badge-blue',
      archivado: 'badge-gray',
    };
    return map[estado] || 'badge-gray';
  };

  if (loading) return <LayoutShell title="Clientes"><div className="loading-state">Cargando clientes...</div></LayoutShell>;
  if (error) return <LayoutShell title="Clientes"><div className="error-state">Error: {error}</div></LayoutShell>;

  return (
    <LayoutShell 
      title="Clientes" 
      description="Gestiona tu cartera de clientes. Crea, edita y consulta información de contacto, estado y expedientes de cada cliente."
    >
      <div className="page-toolbar">
        <h2>Gestión de Clientes</h2>
        <button onClick={() => { setEditingCliente(null); setIsModalOpen(true); }} className="btn btn-primary">
          <UserPlus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {/* Estadísticas de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-100 text-sm font-medium mb-1">Clientes activos</div>
              <div className="text-2xl font-bold">{calcularClientesActivos()}</div>
              <div className="text-blue-100 text-xs mt-1">De {clientes.length} totales</div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-100 text-sm font-medium mb-1">Total presupuestos</div>
              <div className="text-2xl font-bold">{calcularTotalPresupuesto().toFixed(0)}€</div>
              <div className="text-green-100 text-xs mt-1">Suma de todos los expedientes</div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-purple-100 text-sm font-medium mb-1">Total cobrado</div>
              <div className="text-2xl font-bold">{calcularTotalCobrado().toFixed(0)}€</div>
              <div className="text-purple-100 text-xs mt-1">Suma de todos los cobros</div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-amber-100 text-sm font-medium mb-1">Nuevos este mes</div>
              <div className="text-2xl font-bold">{calcularClientesNuevosMes()}</div>
              <div className="text-amber-100 text-xs mt-1">Clientes nuevos</div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        {/* Búsqueda Principal */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes por nombre, NIF, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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
            <button
              onClick={() => setShowEstadoFilter(!showEstadoFilter)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                estadoFilter 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{estadoFilter || 'Estado'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showEstadoFilter ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showEstadoFilter && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Seleccionar estado</div>
                  {[
                    { value: 'activo', label: 'Activo' },
                    { value: 'pendiente', label: 'Pendiente' },
                    { value: 'pagado', label: 'Pagado' },
                    { value: 'archivado', label: 'Archivado' }
                  ].map(estado => (
                    <button
                      key={estado.value}
                      onClick={() => {
                        setEstadoFilter(estadoFilter === estado.value ? '' : estado.value);
                        setShowEstadoFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        estadoFilter === estado.value 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {estado.label}
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
          <span className="ml-2">Mostrando {filteredClientes.length} de {clientes.length} clientes</span>
        </div>
      )}

      {/* Tabla de Clientes */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Expedientes</th>
              <th>Contacto</th>
              <th>Fecha entrada</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.length === 0 ? (
              <tr><td colSpan={6} className="empty-state">{searchQuery || estadoFilter ? 'Sin resultados' : 'No hay clientes registrados'}</td></tr>
            ) : (
              filteredClientes.map((c) => {
                const procsCliente = procedimientos.filter(p => p.cliente_id === c.id);
                const procsActivos = procsCliente.filter(p =>
                  !['cerrado', 'archivado'].includes(p.estado)
                ).length;
                return (
                  <tr key={c.id}>
                    <td className="font-medium">{[c.nombre, c.apellidos].filter(Boolean).join(' ')}</td>
                    <td className="subtle-text">
                      {procsCliente.length > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-blue-600 font-medium">{procsActivos}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-500">{procsCliente.length}</span>
                          <span className="text-xs text-gray-400 ml-1">activos</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="subtle-text">{c.telefono || c.email || '—'}</td>
                    <td>{c.fecha_entrada}</td>
                    <td><span className={`badge ${estadoBadge(c.estado)}`}>{c.estado}</span></td>
                    <td>
                      <div className="action-buttons">
                        <Link href={`/clientes/${c.id}`} className="action-btn action-view" title="Ver detalle"><Eye className="w-4 h-4" /></Link>
                        <button onClick={() => { setEditingCliente(c); setIsModalOpen(true); }} className="action-btn action-edit" title="Editar"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(c)} className="action-btn action-delete" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <ClienteFormV2
          cliente={editingCliente || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          allowProcedimiento={!editingCliente}
        />
      </Modal>
    </LayoutShell>
  );
}
