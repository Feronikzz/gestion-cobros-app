'use client';

import React, { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { ClienteFormV2 } from '@/components/cliente-form-v2';
import { Modal } from '@/components/modal';
import { useClientes } from '@/lib/hooks/use-clientes';
import type { Cliente, ClienteInsert, EstadoProcedimiento } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Eye, Edit, Trash2, UserPlus, Users, TrendingUp, Calendar, Search, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, ArrowUpDown, Archive } from 'lucide-react';

export default function ClientesPage() {
  const { clientes, loading, error, createCliente, updateCliente, deleteCliente } = useClientes();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [showEstadoFilter, setShowEstadoFilter] = useState(false);

  // Ordenación
  const [sortField, setSortField] = useState<'apellidos' | 'nombre' | 'fecha_entrada'>('apellidos');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Funciones de estadísticas
  const calcularClientesActivos = () => {
    return clientes.filter(c => c.estado === 'activo').length;
  };

  const calcularClientesPendientes = () => {
    return clientes.filter(c => c.estado === 'pendiente').length;
  };

  const calcularClientesArchivados = () => {
    return clientes.filter(c => c.estado === 'archivado').length;
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
    setCurrentPage(1);
  };

  // Reset página al cambiar filtros
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, estadoFilter]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filteredClientes = useMemo(() => {
    const filtered = clientes.filter(c => {
      const q = searchQuery.toLowerCase();
      const fullApellidos = [c.apellido1, c.apellido2].filter(Boolean).join(' ') || c.apellidos || '';
      const matchesSearch = !q ||
        c.nombre.toLowerCase().includes(q) ||
        fullApellidos.toLowerCase().includes(q) ||
        c.nif?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.notas?.toLowerCase().includes(q);
      const matchesEstado = !estadoFilter || c.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });

    // Ordenar
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'apellidos') {
        const aVal = (a.apellido1 || a.apellidos || '').toLowerCase() + ' ' + a.nombre.toLowerCase();
        const bVal = (b.apellido1 || b.apellidos || '').toLowerCase() + ' ' + b.nombre.toLowerCase();
        cmp = aVal.localeCompare(bVal);
      } else if (sortField === 'nombre') {
        const aVal = a.nombre.toLowerCase() + ' ' + (a.apellido1 || a.apellidos || '').toLowerCase();
        const bVal = b.nombre.toLowerCase() + ' ' + (b.apellido1 || b.apellidos || '').toLowerCase();
        cmp = aVal.localeCompare(bVal);
      } else if (sortField === 'fecha_entrada') {
        cmp = a.fecha_entrada.localeCompare(b.fecha_entrada);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [clientes, searchQuery, estadoFilter, sortField, sortDir]);

  // Clientes paginados
  const paginatedClientes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClientes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClientes, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage) || 1;

  const handleSubmit = async (
    data: Omit<ClienteInsert, 'user_id'>,
    docs: { tipo: string; numero: string; fecha_expedicion: string; fecha_caducidad: string; es_principal: boolean }[],
    proc: { titulo: string; concepto: string; presupuesto: number; tiene_entrada: boolean; importe_entrada: number; estado: EstadoProcedimiento } | null
  ) => {
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, data);
        
        // Guardar documentos de identidad
        if (docs.length > 0) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Eliminar docs existentes y reinsertar
            await supabase.from('documentos_identidad').delete().eq('cliente_id', editingCliente.id);
            await supabase.from('documentos_identidad').insert(
              docs.filter(d => d.numero).map(d => ({
                user_id: user.id,
                cliente_id: editingCliente.id,
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
      } else {
        const newCliente = await createCliente(data);
        
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
      <div className="stats-grid-mobile mb-6">
        <div className="stat-card-mobile stat-card-blue">
          <div className="stat-content-mobile">
            <div className="stat-info-mobile">
              <div className="stat-label-mobile">Clientes activos</div>
              <div className="stat-number-mobile">{calcularClientesActivos()}</div>
              <div className="stat-subtext-mobile">De {clientes.length} totales</div>
            </div>
            <div className="stat-icon-mobile stat-icon-blue">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
        
        <div className="stat-card-mobile stat-card-amber">
          <div className="stat-content-mobile">
            <div className="stat-info-mobile">
              <div className="stat-label-mobile">Pendientes</div>
              <div className="stat-number-mobile">{calcularClientesPendientes()}</div>
              <div className="stat-subtext-mobile">Clientes pendientes</div>
            </div>
            <div className="stat-icon-mobile stat-icon-amber">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>
        
        <div className="stat-card-mobile stat-card-gray">
          <div className="stat-content-mobile">
            <div className="stat-info-mobile">
              <div className="stat-label-mobile">Archivados</div>
              <div className="stat-number-mobile">{calcularClientesArchivados()}</div>
              <div className="stat-subtext-mobile">Clientes archivados</div>
            </div>
            <div className="stat-icon-mobile stat-icon-gray">
              <Archive className="w-5 h-5" />
            </div>
          </div>
        </div>
        
        <div className="stat-card-mobile stat-card-green">
          <div className="stat-content-mobile">
            <div className="stat-info-mobile">
              <div className="stat-label-mobile">Nuevos este mes</div>
              <div className="stat-number-mobile">{calcularClientesNuevosMes()}</div>
              <div className="stat-subtext-mobile">Clientes nuevos</div>
            </div>
            <div className="stat-icon-mobile stat-icon-green">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="search-filters-mobile mb-6">
        {/* Búsqueda Principal */}
        <div className="search-container-mobile">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-mobile"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="search-clear-mobile"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="filters-container-mobile">
          {/* Filtro de Estado */}
          <div className="filter-dropdown-mobile">
            <button
              onClick={() => setShowEstadoFilter(!showEstadoFilter)}
              className={`filter-button-mobile ${
                estadoFilter ? 'filter-button-active' : ''
              }`}
            >
              <Users className="w-3 h-3" />
              <span>{estadoFilter || 'Estado'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showEstadoFilter ? 'rotate-180' : ''}`} />
            </button>

            {showEstadoFilter && (
              <div className="filter-menu-mobile">
                <div className="filter-menu-header">Seleccionar estado</div>
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
                    className={`filter-option-mobile ${
                      estadoFilter === estado.value ? 'filter-option-active' : ''
                    }`}
                  >
                    {estado.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón Limpiar */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="clear-filters-mobile"
            >
              <X className="w-3 h-3" />
              <span>Limpiar ({activeFiltersCount})</span>
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

      {/* Info de paginación */}
      <div className="pagination-info-mobile mb-4">
        <div className="pagination-text-mobile">
          Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredClientes.length)}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredClientes.length)}</span> de <span className="font-medium">{filteredClientes.length}</span> clientes
        </div>
        <div className="pagination-controls-mobile">
          <label className="pagination-label-mobile">Por página:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="pagination-select-mobile"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="table-container table-container-mobile">
        <div className="table-header-mobile">
          <div className="table-sort-mobile">
            <button onClick={() => toggleSort(sortField === 'apellidos' ? 'nombre' : 'apellidos')} className="table-sort-button-mobile">
              <span>Cliente</span>
              {sortField === 'apellidos' || sortField === 'nombre' ? (
                sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              ) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
            </button>
          </div>
          <div className="table-sort-mobile">
            <button onClick={() => toggleSort('fecha_entrada')} className="table-sort-button-mobile">
              <span>Fecha</span>
              {sortField === 'fecha_entrada' ? (
                sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
              ) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
            </button>
          </div>
        </div>
        
        <div className="table-body-mobile">
          {filteredClientes.length === 0 ? (
            <div className="empty-state-mobile">
              {searchQuery || estadoFilter ? 'Sin resultados' : 'No hay clientes registrados'}
            </div>
          ) : (
            paginatedClientes.map((c) => (
              <div key={c.id} className="table-row-mobile">
                <div className="table-row-header-mobile">
                  <div className="table-row-name-mobile">
                    {[c.nombre, c.apellido1, c.apellido2].filter(Boolean).join(' ') || [c.nombre, c.apellidos].filter(Boolean).join(' ')}
                  </div>
                  <div className="table-row-actions-mobile">
                    <Link href={`/clientes/${c.id}`} className="action-btn-mobile action-view-mobile" title="Ver detalle">
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button onClick={() => { setEditingCliente(c); setIsModalOpen(true); }} className="action-btn-mobile action-edit-mobile" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c)} className="action-btn-mobile action-delete-mobile" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="table-row-content-mobile">
                  <div className="table-row-info-mobile">
                    <div className="table-row-contact-mobile">
                      {c.telefono || c.email || '—'}
                    </div>
                    <div className="table-row-date-mobile">
                      {c.fecha_entrada}
                    </div>
                  </div>
                  <div className="table-row-status-mobile">
                    <span className={`badge ${estadoBadge(c.estado)}`}>{c.estado}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="pagination-controls-bottom-mobile">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="pagination-nav-button-mobile"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>
          
          <div className="pagination-numbers-mobile">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`pagination-number-mobile ${
                    currentPage === pageNum ? 'pagination-number-active' : ''
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="pagination-nav-button-mobile"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'} size="wide" confirmClose>
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
