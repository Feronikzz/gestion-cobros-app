'use client';

import { useState } from 'react';
import type { Actividad, TipoActividad, PrioridadActividad, ActividadInsert } from '@/lib/supabase/types';
import { TIPO_LABELS } from '@/components/actividad-form';
import { CheckCircle, CalendarPlus, AlertTriangle, FileText, X } from 'lucide-react';

interface ActividadCompleteDialogProps {
  actividad: Actividad;
  clienteNombre?: string;
  onComplete: (resultado: string) => Promise<void>;
  onCompleteAndSchedule: (resultado: string, nuevaActividad: Omit<ActividadInsert, 'user_id'>) => Promise<void>;
  onCancel: () => void;
}

export function ActividadCompleteDialog({ actividad, clienteNombre, onComplete, onCompleteAndSchedule, onCancel }: ActividadCompleteDialogProps) {
  const [resultado, setResultado] = useState('');
  const [action, setAction] = useState<'complete' | 'reschedule' | null>(null);
  const [loading, setLoading] = useState(false);

  // Reschedule form
  const [nuevaTitulo, setNuevaTitulo] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaPrioridad, setNuevaPrioridad] = useState<PrioridadActividad>(actividad.prioridad || 'media');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (action === 'reschedule') {
        const defaultTitulo = nuevaTitulo || `Seguimiento: ${actividad.titulo}`;
        await onCompleteAndSchedule(resultado, {
          tipo: actividad.tipo as TipoActividad,
          titulo: defaultTitulo,
          descripcion: nuevaDescripcion || null,
          estado: 'pendiente',
          prioridad: nuevaPrioridad,
          fecha_programada: nuevaFecha || null,
          fecha_completada: null,
          duracion_minutos: null,
          resultado: null,
          cliente_id: actividad.cliente_id,
          procedimiento_id: actividad.procedimiento_id,
        });
      } else {
        await onComplete(resultado);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Resumen actividad */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm font-medium text-gray-900">{actividad.titulo}</div>
        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
          <span>{TIPO_LABELS[actividad.tipo as TipoActividad] || actividad.tipo}</span>
          {clienteNombre && <span className="text-blue-600">• {clienteNombre}</span>}
        </div>
      </div>

      {/* Resultado / Notas */}
      <div>
        <label className="form-label">¿Cómo fue? Notas de cierre</label>
        <textarea
          value={resultado}
          onChange={e => setResultado(e.target.value)}
          className="form-input"
          rows={3}
          placeholder="Describe el resultado: qué se habló, qué se acordó, datos obtenidos..."
          autoFocus
        />
      </div>

      {/* Checklist rápida */}
      <div>
        <label className="form-label text-gray-600 mb-2 block">¿Hay algo pendiente?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAction(action === 'complete' ? null : 'complete')}
            className={`flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-all ${
              action === 'complete'
                ? 'border-green-500 bg-green-50 text-green-800'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-medium">Completar sin más</div>
              <div className="text-xs text-gray-500">Todo en orden, no hay seguimiento</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setAction(action === 'reschedule' ? null : 'reschedule')}
            className={`flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-all ${
              action === 'reschedule'
                ? 'border-blue-500 bg-blue-50 text-blue-800'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <CalendarPlus className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-medium">Reagendar / Seguimiento</div>
              <div className="text-xs text-gray-500">Faltan datos, archivos, o hay nueva cita</div>
            </div>
          </button>
        </div>
      </div>

      {/* Reschedule form */}
      {action === 'reschedule' && (
        <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3">
          <div className="text-sm font-medium text-blue-800 flex items-center gap-1.5">
            <CalendarPlus className="w-4 h-4" />
            Nueva actividad de seguimiento
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="form-label text-xs">Título</label>
              <input
                type="text"
                value={nuevaTitulo}
                onChange={e => setNuevaTitulo(e.target.value)}
                className="form-input text-sm"
                placeholder={`Seguimiento: ${actividad.titulo}`}
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label text-xs">Descripción / Motivo</label>
              <textarea
                value={nuevaDescripcion}
                onChange={e => setNuevaDescripcion(e.target.value)}
                className="form-input text-sm"
                rows={2}
                placeholder="Ej: Falta DNI, pendiente de entregar documentación, nueva cita para firma..."
              />
            </div>
            <div>
              <label className="form-label text-xs">Fecha programada</label>
              <input
                type="datetime-local"
                value={nuevaFecha}
                onChange={e => setNuevaFecha(e.target.value)}
                className="form-input text-sm"
              />
            </div>
            <div>
              <label className="form-label text-xs">Prioridad</label>
              <select
                value={nuevaPrioridad}
                onChange={e => setNuevaPrioridad(e.target.value as PrioridadActividad)}
                className="form-input text-sm"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancelar</button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !action}
          className="btn btn-primary"
        >
          {loading ? 'Guardando...' : action === 'reschedule' ? 'Completar y reagendar' : 'Completar actividad'}
        </button>
      </div>
    </div>
  );
}
