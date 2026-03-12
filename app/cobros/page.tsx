'use client';

import { useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { CobroForm } from '@/components/cobro-form';
import { Modal } from '@/components/modal';
import { useCobros } from '@/lib/hooks/use-cobros';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import type { Cobro } from '@/lib/supabase/types';
import { eur } from '@/lib/utils';
import { Plus, FileText, DollarSign, Edit3, Trash2 } from 'lucide-react';

export default function CobrosPage() {
  const { cobros, loading, error, createCobro, updateCobro, deleteCobro } = useCobros();
  const { clientes } = useClientes();
  const { procedimientos } = useProcedimientos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCobro, setEditingCobro] = useState<Cobro | null>(null);

  const handleCreate = () => {
    setEditingCobro(null);
    setIsModalOpen(true);
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
            {cobros.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  No hay cobros registrados
                </td>
              </tr>
            ) : (
              cobros.map((cobro) => (
                <tr key={cobro.id}>
                  <td>{cobro.fecha_cobro}</td>
                  <td className="font-medium">{getClienteNombre(cobro.cliente_id)}</td>
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
