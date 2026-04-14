'use client';

import { useState } from 'react';
import type { Actividad, TipoActividad, EstadoActividad } from '@/lib/supabase/types';
import { TIPO_ICONS, TIPO_LABELS, PRIORIDAD_COLORS } from '@/components/actividad-form';
import { Check, X, Clock, Edit, Trash2, ChevronDown, ChevronUp, AlertTriangle, User, ExternalLink } from 'lucide-react';

const ESTADO_ICONS: Record<EstadoActividad, React.ReactNode> = {
  pendiente: <Clock className="w-3.5 h-3.5 text-yellow-600" />,
  en_progreso: <Clock className="w-3.5 h-3.5 text-blue-600" />,
  completada: <Check className="w-3.5 h-3.5 text-green-600" />,
  cancelada: <X className="w-3.5 h-3.5 text-gray-400" />,
};

const ESTADO_LABELS: Record<EstadoActividad, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

interface ActividadTimelineProps {
  actividades: Actividad[];
  onComplete: (id: string) => void;
  onEdit: (actividad: Actividad) => void;
  onDelete: (id: string) => void;
  showCliente?: boolean;
  clienteNombres?: Record<string, string>;
  onClienteClick?: (clienteId: string) => void;
}

export function ActividadTimeline({ actividades, onComplete, onEdit, onDelete, showCliente, clienteNombres, onClienteClick }: ActividadTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'completadas'>('todas');

  const filtered = actividades.filter(a => {
    if (filter === 'pendientes') return a.estado === 'pendiente' || a.estado === 'en_progreso';
    if (filter === 'completadas') return a.estado === 'completada';
    return true;
  });

  const isOverdue = (a: Actividad) => {
    if (!a.fecha_programada || a.estado === 'completada' || a.estado === 'cancelada') return false;
    return new Date(a.fecha_programada) < new Date();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === tomorrow.toDateString()) return 'Mañana';
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {(['todas', 'pendientes', 'completadas'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'todas' ? 'Todas' : f === 'pendientes' ? 'Pendientes' : 'Completadas'}
            <span className="ml-1 opacity-70">
              ({actividades.filter(a => {
                if (f === 'pendientes') return a.estado === 'pendiente' || a.estado === 'en_progreso';
                if (f === 'completadas') return a.estado === 'completada';
                return true;
              }).length})
            </span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-8 text-sm">No hay actividades {filter !== 'todas' ? `${filter}` : ''}</p>
      ) : (
        <div className="relative">
          {/* Línea vertical */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200"></div>

          <div className="space-y-1">
            {filtered.map(a => {
              const overdue = isOverdue(a);
              const expanded = expandedId === a.id;

              return (
                <div key={a.id} className={`relative pl-12 ${a.estado === 'cancelada' ? 'opacity-50' : ''}`}>
                  {/* Punto en la timeline */}
                  <div className={`absolute left-3 w-5 h-5 rounded-full flex items-center justify-center ${
                    a.estado === 'completada' ? 'bg-green-100' :
                    overdue ? 'bg-red-100' :
                    a.estado === 'en_progreso' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    {TIPO_ICONS[a.tipo as TipoActividad] || TIPO_ICONS.otro}
                  </div>

                  <div className={`p-3 rounded-lg border transition-colors ${
                    overdue ? 'border-red-200 bg-red-50/30' :
                    a.estado === 'completada' ? 'border-green-200 bg-green-50/20' :
                    'border-gray-200 hover:border-gray-300'
                  }`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">{a.titulo}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded-full ${PRIORIDAD_COLORS[a.prioridad]}`}>
                            {a.prioridad}
                          </span>
                          {overdue && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                              <AlertTriangle className="w-3 h-3" /> Vencida
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{TIPO_LABELS[a.tipo as TipoActividad] || a.tipo}</span>
                          {a.fecha_programada && (
                            <span>{formatDate(a.fecha_programada)} {formatTime(a.fecha_programada)}</span>
                          )}
                          {a.duracion_minutos && <span>{a.duracion_minutos} min</span>}
                          {showCliente && a.cliente_id && clienteNombres?.[a.cliente_id] && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onClienteClick?.(a.cliente_id!); }}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                              title="Ver ficha del cliente"
                            >
                              <User className="w-3 h-3" />
                              {clienteNombres[a.cliente_id]}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Acciones rápidas */}
                      <div className="flex items-center gap-1">
                        {a.estado !== 'completada' && a.estado !== 'cancelada' && (
                          <button onClick={() => onComplete(a.id)} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Completar">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => onEdit(a)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Editar">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(a.id)} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setExpandedId(expanded ? null : a.id)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Contenido expandido */}
                    {expanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm space-y-2">
                        {a.descripcion && (
                          <div>
                            <span className="text-gray-500 text-xs">Descripción:</span>
                            <p className="text-gray-700">{a.descripcion}</p>
                          </div>
                        )}
                        {a.resultado && (
                          <div>
                            <span className="text-gray-500 text-xs">Resultado:</span>
                            <p className="text-gray-700">{a.resultado}</p>
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Estado: {ESTADO_LABELS[a.estado]}</span>
                          <span>Creada: {new Date(a.created_at).toLocaleDateString('es-ES')}</span>
                          {a.fecha_completada && <span>Completada: {new Date(a.fecha_completada).toLocaleDateString('es-ES')}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
