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
        <div className="space-y-4">
          {displayNotas.map((nota, index) => (
            <div key={nota.id} className="group relative">
              {/* Tarjeta de nota con diseño moderno */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Header de la nota */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                        Nota #{displayNotas.length - index}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatDate(nota.created_at)}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex items-center gap-1">
                          {editingNota?.id === nota.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditNota(editingNota)}
                                className="p-1.5 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors"
                                title="Guardar"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setEditingNota(null)}
                                className="p-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                                title="Cancelar"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingNota(nota)}
                                className="p-1.5 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
                                title="Editar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteNota(nota.id)}
                                className="p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Contenido de la nota */}
                <div className="p-4">
                  {editingNota?.id === nota.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editingNota.nota}
                        onChange={(e) => setEditingNota({ ...editingNota, nota: e.target.value })}
                        className="w-full p-3 border border-blue-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        placeholder="Edita tu nota..."
                        autoFocus
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <span className="text-gray-500">
                          {editingNota.nota.length} caracteres
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" style={{
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}>
                        {nota.nota}
                      </p>
                      <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Hace {getRelativeTime(nota.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span>{nota.nota.length} caracteres</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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
