'use client';

import { useState } from 'react';
import type { ClienteNota } from '@/lib/supabase/types';
import { useNotas } from '@/lib/hooks/use-notas';
import { Edit3, Trash2, Plus, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useConfirm } from '@/components/confirm-dialog';

interface ClienteNotasProps {
  clienteId: string;
}

export function ClienteNotas({ clienteId }: ClienteNotasProps) {
  const { confirm } = useConfirm();
  const { notas, loading, createNota, updateNota, deleteNota } = useNotas(clienteId);
  const [showAll, setShowAll] = useState(false);
  const [editingNota, setEditingNota] = useState<ClienteNota | null>(null);
  const [newNotaText, setNewNotaText] = useState('');
  const [isAddingNota, setIsAddingNota] = useState(false);

  const displayNotas = showAll ? notas : notas.slice(0, 3);

  const handleAddNota = async () => {
    if (!newNotaText.trim()) return;
    
    try {
      await createNota({
        cliente_id: clienteId,
        nota: newNotaText.trim()
      });
      setNewNotaText('');
      setIsAddingNota(false);
    } catch (error) {
      console.error('Error al añadir nota:', error);
    }
  };

  const handleEditNota = async (nota: ClienteNota) => {
    try {
      await updateNota(nota.id, { nota: nota.nota });
      setEditingNota(null);
    } catch (error) {
      console.error('Error al actualizar nota:', error);
    }
  };

  const handleDeleteNota = async (id: string) => {
    if (await confirm({ title: 'Eliminar nota', message: '¿Estás seguro de eliminar esta nota?', variant: 'danger' })) {
      try {
        await deleteNota(id);
      } catch (error) {
        console.error('Error al eliminar nota:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'menos de 1 minuto';
    if (diffInMinutes < 60) return `${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
    if (diffInHours < 24) return `${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    if (diffInDays < 30) return `${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-block">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <h3>Notas del cliente</h3>
          <span className="text-sm text-gray-500">({notas.length})</span>
        </div>
        <button
          onClick={() => setIsAddingNota(true)}
          className="btn btn-primary btn-sm"
        >
          <Plus className="w-4 h-4" /> Añadir nota
        </button>
      </div>

      {/* Add new nota */}
      {isAddingNota && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <textarea
            value={newNotaText}
            onChange={(e) => setNewNotaText(e.target.value)}
            placeholder="Escribe una nota..."
            className="form-input"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-3">
            <button
              onClick={() => {
                setIsAddingNota(false);
                setNewNotaText('');
              }}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddNota}
              disabled={!newNotaText.trim()}
              className="btn btn-primary"
            >
              Guardar nota
            </button>
          </div>
        </div>
      )}

      {/* Notas list */}
      {displayNotas.length === 0 ? (
        <div className="empty-state">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No hay notas registradas</p>
          <p className="text-sm mt-1">Añade la primera nota para este cliente</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nota</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayNotas.map((nota) => (
                <tr key={nota.id}>
                  <td className="text-sm text-gray-500">
                    {formatDate(nota.created_at)}
                  </td>
                  <td>
                    {editingNota?.id === nota.id ? (
                      <textarea
                        value={editingNota.nota}
                        onChange={(e) => setEditingNota({ ...editingNota, nota: e.target.value })}
                        className="form-input"
                        rows={3}
                        autoFocus
                        style={{ minWidth: '300px' }}
                      />
                    ) : (
                      <p className="text-gray-800 whitespace-pre-wrap">{nota.nota}</p>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {editingNota?.id === nota.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditNota(editingNota)}
                            className="action-btn action-view"
                            title="Guardar"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingNota(null)}
                            className="action-btn action-delete"
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingNota(nota)}
                            className="action-btn action-edit"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNota(nota.id)}
                            className="action-btn action-delete"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Show more/less button */}
      {notas.length > 3 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-blue-600 hover:text-blue-700 transition-colors text-sm"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 inline mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 inline mr-1" />
                Mostrar {notas.length - 3} notas más
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
