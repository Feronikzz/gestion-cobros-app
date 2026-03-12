'use client';

import { useState } from 'react';
import type { ClienteNota } from '@/lib/supabase/types';
import { useNotas } from '@/lib/hooks/use-notas';
import { Edit3, Trash2, Plus, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

interface ClienteNotasProps {
  clienteId: string;
}

export function ClienteNotas({ clienteId }: ClienteNotasProps) {
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
    if (window.confirm('¿Estás seguro de eliminar esta nota?')) {
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Notas del cliente</h3>
            <span className="text-sm text-gray-500">({notas.length})</span>
          </div>
          <button
            onClick={() => setIsAddingNota(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Añadir nota
          </button>
        </div>
      </div>

      {/* Add new nota */}
      {isAddingNota && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <textarea
            value={newNotaText}
            onChange={(e) => setNewNotaText(e.target.value)}
            placeholder="Escribe una nota..."
            className="w-full p-3 border border-blue-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setIsAddingNota(false);
                setNewNotaText('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddNota}
              disabled={!newNotaText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Guardar nota
            </button>
          </div>
        </div>
      )}

      {/* Notas list */}
      <div className="divide-y divide-gray-100">
        {displayNotas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay notas registradas</p>
            <p className="text-sm mt-1">Añade la primera nota para este cliente</p>
          </div>
        ) : (
          displayNotas.map((nota) => (
            <div key={nota.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  {editingNota?.id === nota.id ? (
                    <textarea
                      value={editingNota.nota}
                      onChange={(e) => setEditingNota({ ...editingNota, nota: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <p className="text-gray-800 whitespace-pre-wrap">{nota.nota}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">{formatDate(nota.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {editingNota?.id === nota.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditNota(editingNota)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Guardar"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingNota(null)}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                        title="Cancelar"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingNota(nota)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNota(nota.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show more/less button */}
      {notas.length > 3 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 mx-auto text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Mostrar {notas.length - 3} notas más
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
