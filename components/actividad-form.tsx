'use client';

import { useState, useEffect } from 'react';
import type { Actividad, TipoActividad, EstadoActividad, PrioridadActividad, ActividadInsert } from '@/lib/supabase/types';
import { Phone, PhoneIncoming, PhoneOutgoing, Mail, MailOpen, MapPin, Users, ClipboardList, MessageSquare, Send, MessageCircle, HelpCircle } from 'lucide-react';

const TIPO_ICONS: Record<TipoActividad, React.ReactNode> = {
  llamada_entrante: <PhoneIncoming className="w-4 h-4" />,
  llamada_saliente: <PhoneOutgoing className="w-4 h-4" />,
  email_enviado: <Send className="w-4 h-4" />,
  email_recibido: <MailOpen className="w-4 h-4" />,
  visita: <MapPin className="w-4 h-4" />,
  reunion: <Users className="w-4 h-4" />,
  tarea: <ClipboardList className="w-4 h-4" />,
  nota: <MessageSquare className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  sms: <Mail className="w-4 h-4" />,
  otro: <HelpCircle className="w-4 h-4" />,
};

const TIPO_LABELS: Record<TipoActividad, string> = {
  llamada_entrante: 'Llamada entrante',
  llamada_saliente: 'Llamada saliente',
  email_enviado: 'Email enviado',
  email_recibido: 'Email recibido',
  visita: 'Visita',
  reunion: 'Reunión',
  tarea: 'Tarea',
  nota: 'Nota',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  otro: 'Otro',
};

const PRIORIDAD_COLORS: Record<PrioridadActividad, string> = {
  baja: 'bg-gray-100 text-gray-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
};

export { TIPO_ICONS, TIPO_LABELS, PRIORIDAD_COLORS };

interface ActividadFormProps {
  actividad?: Actividad;
  clienteId?: string;
  procedimientoId?: string;
  onSubmit: (data: Omit<ActividadInsert, 'user_id'>) => Promise<void>;
  onCancel: () => void;
}

export function ActividadForm({ actividad, clienteId, procedimientoId, onSubmit, onCancel }: ActividadFormProps) {
  const [form, setForm] = useState({
    tipo: actividad?.tipo || 'tarea' as TipoActividad,
    titulo: actividad?.titulo || '',
    descripcion: actividad?.descripcion || '',
    estado: actividad?.estado || 'pendiente' as EstadoActividad,
    prioridad: actividad?.prioridad || 'media' as PrioridadActividad,
    fecha_programada: actividad?.fecha_programada?.slice(0, 16) || '',
    duracion_minutos: actividad?.duracion_minutos?.toString() || '',
    resultado: actividad?.resultado || '',
    cliente_id: actividad?.cliente_id || clienteId || null,
    procedimiento_id: actividad?.procedimiento_id || procedimientoId || null,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        tipo: form.tipo as TipoActividad,
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        estado: form.estado as EstadoActividad,
        prioridad: form.prioridad as PrioridadActividad,
        fecha_programada: form.fecha_programada || null,
        fecha_completada: form.estado === 'completada' ? new Date().toISOString() : null,
        duracion_minutos: form.duracion_minutos ? parseInt(form.duracion_minutos) : null,
        resultado: form.resultado || null,
        cliente_id: form.cliente_id,
        procedimiento_id: form.procedimiento_id,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-título según tipo
  useEffect(() => {
    if (!actividad && !form.titulo) {
      const now = new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setForm(prev => ({ ...prev, titulo: `${TIPO_LABELS[prev.tipo as TipoActividad]} - ${now}` }));
    }
  }, [form.tipo]);

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {/* Tipo rápido */}
      <div>
        <label className="form-label">Tipo de actividad</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {(Object.keys(TIPO_LABELS) as TipoActividad[]).map(tipo => (
            <button
              key={tipo}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, tipo }))}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                form.tipo === tipo
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              {TIPO_ICONS[tipo]}
              <span className="truncate w-full text-center">{TIPO_LABELS[tipo]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="form-label">Título *</label>
          <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="form-input" required />
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Descripción</label>
          <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="form-input" rows={3} placeholder="Detalle de la actividad..." />
        </div>
        <div>
          <label className="form-label">Prioridad</label>
          <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value as PrioridadActividad })} className="form-input">
            <option value="baja">🟢 Baja</option>
            <option value="media">🔵 Media</option>
            <option value="alta">🟠 Alta</option>
            <option value="urgente">🔴 Urgente</option>
          </select>
        </div>
        <div>
          <label className="form-label">Estado</label>
          <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as EstadoActividad })} className="form-input">
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En progreso</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <div>
          <label className="form-label">Fecha programada</label>
          <input type="datetime-local" value={form.fecha_programada} onChange={e => setForm({ ...form, fecha_programada: e.target.value })} className="form-input" />
        </div>
        <div>
          <label className="form-label">Duración (minutos)</label>
          <input type="number" min="0" value={form.duracion_minutos} onChange={e => setForm({ ...form, duracion_minutos: e.target.value })} className="form-input" placeholder="30" />
        </div>
        {(form.estado === 'completada') && (
          <div className="md:col-span-2">
            <label className="form-label">Resultado / Notas de cierre</label>
            <textarea value={form.resultado} onChange={e => setForm({ ...form, resultado: e.target.value })} className="form-input" rows={2} placeholder="¿Cómo fue? ¿Qué se acordó?" />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : actividad ? 'Actualizar' : 'Registrar actividad'}
        </button>
      </div>
    </form>
  );
}
