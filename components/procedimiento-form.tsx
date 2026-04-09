'use client';

import { useState } from 'react';
import type { Procedimiento, EstadoProcedimiento } from '@/lib/supabase/types';
import { formatField } from '@/lib/utils/text';

interface ProcedimientoFormProps {
  procedimiento?: Procedimiento;
  clienteId: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const estadoProcLabel: Record<EstadoProcedimiento, string> = {
  pendiente: 'Pendiente',
  pendiente_presentar: 'Pte. presentar',
  presentado: 'Presentado',
  pendiente_resolucion: 'Pte. resolución',
  pendiente_recurso: 'Pte. recurso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  archivado: 'Archivado',
};

// Campos que solo tienen sentido una vez presentado el procedimiento
const CAMPOS_POST_PRESENTACION: EstadoProcedimiento[] = [
  'presentado', 'pendiente_resolucion', 'pendiente_recurso', 'resuelto', 'cerrado', 'archivado'
];

export function ProcedimientoForm({ procedimiento, clienteId, onSubmit, onCancel }: ProcedimientoFormProps) {
  const isEditing = !!procedimiento;

  const [form, setForm] = useState({
    titulo: procedimiento?.titulo || '',
    concepto: procedimiento?.concepto || '',
    presupuesto: procedimiento?.presupuesto || 0,
    tiene_entrada: procedimiento?.tiene_entrada || false,
    importe_entrada: procedimiento?.importe_entrada || 0,
    nie_interesado: procedimiento?.nie_interesado || '',
    nombre_interesado: procedimiento?.nombre_interesado || '',
    expediente_referencia: procedimiento?.expediente_referencia || '',
    fecha_presentacion: procedimiento?.fecha_presentacion || '',
    fecha_resolucion: procedimiento?.fecha_resolucion || '',
    estado: procedimiento?.estado || 'pendiente_presentar' as EstadoProcedimiento,
    notas: procedimiento?.notas || '',
  });

  const [loading, setLoading] = useState(false);

  // ¿Mostrar campos de post-presentación?
  const showPostPresentacion = isEditing && CAMPOS_POST_PRESENTACION.includes(form.estado);
  // ¿Mostrar campo de referencia expediente? Solo si ya está presentado o editando
  const showExpedienteRef = isEditing || form.estado !== 'pendiente_presentar';
  // ¿Mostrar resolución? Solo si estado es pendiente_resolucion o posterior
  const showResolucion = isEditing && ['pendiente_resolucion', 'pendiente_recurso', 'resuelto', 'cerrado', 'archivado'].includes(form.estado);

  // Estados disponibles según si es creación o edición
  const estadosDisponibles: EstadoProcedimiento[] = isEditing
    ? ['pendiente', 'pendiente_presentar', 'presentado', 'pendiente_resolucion', 'pendiente_recurso', 'resuelto', 'cerrado', 'archivado']
    : ['pendiente', 'pendiente_presentar'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        titulo: formatField(form.titulo, 'general'),
        concepto: formatField(form.concepto, 'general'),
        nie_interesado: form.nie_interesado ? formatField(form.nie_interesado, 'nif') : null,
        nombre_interesado: form.nombre_interesado ? formatField(form.nombre_interesado, 'name') : null,
        expediente_referencia: form.expediente_referencia || null,
        fecha_presentacion: form.fecha_presentacion || null,
        fecha_resolucion: form.fecha_resolucion || null,
        notas: form.notas ? formatField(form.notas, 'general') : null,
        cliente_id: clienteId,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {/* ── Datos básicos (siempre visibles) ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Datos del procedimiento</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Título *</label>
            <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="form-input" required placeholder="Ej: Solicitud NIE" />
          </div>
          <div>
            <label className="form-label">Concepto *</label>
            <input type="text" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} className="form-input" required placeholder="Ej: Tramitación NIE por arraigo" />
          </div>
          <div>
            <label className="form-label">Presupuesto (€) *</label>
            <input type="number" step="0.01" min="0" value={form.presupuesto} onChange={e => setForm({ ...form, presupuesto: parseFloat(e.target.value) || 0 })} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Estado</label>
            <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as EstadoProcedimiento })} className="form-input">
              {estadosDisponibles.map(est => (
                <option key={est} value={est}>{estadoProcLabel[est]}</option>
              ))}
            </select>
            {!isEditing && (
              <p className="text-xs text-gray-500 mt-1">Más estados disponibles al editar el procedimiento</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* ── Interesado ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Datos del interesado <span className="text-gray-400 font-normal text-xs">(si difiere del cliente)</span></legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">NIE / documento interesado</label>
            <input type="text" value={form.nie_interesado} onChange={e => setForm({ ...form, nie_interesado: e.target.value })} className="form-input" placeholder="Y1234567X" />
          </div>
          <div>
            <label className="form-label">Nombre interesado</label>
            <input type="text" value={form.nombre_interesado} onChange={e => setForm({ ...form, nombre_interesado: e.target.value })} className="form-input" />
          </div>
        </div>
      </fieldset>

      {/* ── Entrada ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Entrada / Señal</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="tiene_entrada" checked={form.tiene_entrada} onChange={e => setForm({ ...form, tiene_entrada: e.target.checked })} className="form-checkbox" />
            <label htmlFor="tiene_entrada" className="form-label" style={{ marginBottom: 0 }}>¿Paga entrada?</label>
          </div>
          {form.tiene_entrada && (
            <div>
              <label className="form-label">Importe de entrada (€)</label>
              <input type="number" step="0.01" min="0" value={form.importe_entrada || ''} onChange={e => setForm({ ...form, importe_entrada: parseFloat(e.target.value) || 0 })} className="form-input" />
            </div>
          )}
        </div>
      </fieldset>

      {/* ── Expediente (condicional) ── */}
      {(showExpedienteRef || isEditing) && (
        <fieldset className="form-fieldset">
          <legend className="form-legend">
            Datos del expediente
            {!isEditing && <span className="text-gray-400 font-normal text-xs ml-2">(se completarán al presentar)</span>}
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Referencia expediente</label>
              <input
                type="text"
                value={form.expediente_referencia}
                onChange={e => setForm({ ...form, expediente_referencia: e.target.value })}
                className="form-input"
                placeholder="EXP-2024/001"
                disabled={!isEditing && form.estado === 'pendiente_presentar'}
              />
              {!isEditing && form.estado === 'pendiente_presentar' && (
                <p className="text-xs text-amber-600 mt-1">Disponible cuando el procedimiento se presente</p>
              )}
            </div>
            <div>
              <label className="form-label">Fecha presentación</label>
              <input
                type="date"
                value={form.fecha_presentacion}
                onChange={e => setForm({ ...form, fecha_presentacion: e.target.value })}
                className="form-input"
                disabled={!isEditing && form.estado === 'pendiente_presentar'}
              />
            </div>
            {showResolucion && (
              <div>
                <label className="form-label">Fecha resolución</label>
                <input type="date" value={form.fecha_resolucion} onChange={e => setForm({ ...form, fecha_resolucion: e.target.value })} className="form-input" />
              </div>
            )}
          </div>
        </fieldset>
      )}

      {/* ── Notas ── */}
      <div>
        <label className="form-label">Notas</label>
        <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} className="form-input" rows={2} placeholder="Observaciones..." />
      </div>

      {/* ── Acciones ── */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear procedimiento'}
        </button>
      </div>
    </form>
  );
}
