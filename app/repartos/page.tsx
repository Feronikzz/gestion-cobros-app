'use client';

import { useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { RepartoForm } from '@/components/reparto-form';
import { Modal } from '@/components/modal';
import { useRepartos } from '@/lib/hooks/use-repartos';
import type { Reparto } from '@/lib/supabase/types';
import { eur, monthLabel } from '@/lib/utils';

export default function RepartosPage() {
  const { repartos, loading, error, createReparto, updateReparto, deleteReparto } = useRepartos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReparto, setEditingReparto] = useState<Reparto | null>(null);

  const handleCreate = () => {
    setEditingReparto(null);
    setIsModalOpen(true);
  };

  const handleEdit = (reparto: Reparto) => {
    setEditingReparto(reparto);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Reparto, 'id' | 'user_id' | 'created_at'>) => {
    try {
      if (editingReparto) {
        await updateReparto(editingReparto.id, data);
      } else {
        await createReparto(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (reparto: Reparto) => {
    if (window.confirm(`¿Estás seguro de eliminar este reparto de ${eur(reparto.importe)} para ${reparto.destinatario}?`)) {
      try {
        await deleteReparto(reparto.id);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  if (loading) {
    return (
      <LayoutShell title="Repartos">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando repartos...</div>
        </div>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell title="Repartos">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Repartos">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Gestión de Repartos
        </h2>
        <button
          onClick={handleCreate}
          className="btn btn-primary"
        >
          Nuevo Reparto
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Mes</th>
              <th>Categoría</th>
              <th>Destinatario</th>
              <th>Concepto</th>
              <th>Importe</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {repartos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No hay repartos registrados
                </td>
              </tr>
            ) : (
              repartos.map((reparto) => (
                <tr key={reparto.id}>
                  <td>{reparto.fecha}</td>
                  <td>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {monthLabel(reparto.mes)}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {reparto.categoria}
                    </span>
                  </td>
                  <td className="font-medium">{reparto.destinatario}</td>
                  <td className="subtle-text">{reparto.concepto}</td>
                  <td className="font-medium text-red-600">{eur(reparto.importe)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(reparto)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(reparto)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
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
        title={editingReparto ? 'Editar Reparto' : 'Nuevo Reparto'}
      >
        <RepartoForm
          reparto={editingReparto || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </LayoutShell>
  );
}
