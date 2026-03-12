'use client';

import { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { ClienteForm } from '@/components/cliente-form';
import { Modal } from '@/components/modal';
import { SearchFilters } from '@/components/search-filters';
import { useClientes } from '@/lib/hooks/use-clientes';
import type { Cliente, ClienteInsert } from '@/lib/supabase/types';
import Link from 'next/link';
import { Eye, Edit, Trash2, UserPlus } from 'lucide-react';

export default function ClientesPage() {
  const { clientes, loading, error, createCliente, updateCliente, deleteCliente } = useClientes();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.nif?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.notas?.toLowerCase().includes(q);
      const matchesEstado = !estadoFilter || c.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [clientes, searchQuery, estadoFilter]);

  const handleSubmit = async (data: Omit<ClienteInsert, 'user_id'>) => {
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, data);
      } else {
        await createCliente(data);
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
    <LayoutShell title="Clientes">
      <div className="page-toolbar">
        <h2 className="page-title">Gestión de Clientes</h2>
        <button onClick={() => { setEditingCliente(null); setIsModalOpen(true); }} className="btn btn-primary">
          <UserPlus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      <SearchFilters
        onSearch={setSearchQuery}
        onFilterChange={(filters) => setEstadoFilter(filters.estado || '')}
        filters={[{ key: 'estado', label: 'Estado', options: [
          { value: 'activo', label: 'Activo' },
          { value: 'pendiente', label: 'Pendiente' },
          { value: 'pagado', label: 'Pagado' },
          { value: 'archivado', label: 'Archivado' },
        ]}]}
        placeholder="Buscar por nombre, NIF, email..."
      />

      <p className="result-count">{filteredClientes.length} de {clientes.length} clientes</p>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>NIF</th>
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
              filteredClientes.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.nombre}</td>
                  <td className="subtle-text">{c.nif || '—'}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <ClienteForm cliente={editingCliente || undefined} onSubmit={handleSubmit} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </LayoutShell>
  );
}
