'use client';

import { useState, useEffect } from 'react';
import type { Procedimiento, RecibiInsert } from '@/lib/supabase/types';

interface RecibiFormInlineProps {
  clienteId: string;
  procedimientos: Procedimiento[];
  onSubmit: (data: Omit<RecibiInsert, 'user_id'>) => Promise<void>;
  onCancel: () => void;
  getNextNumero: () => Promise<string>;
}

export function RecibiFormInline({ clienteId, procedimientos, onSubmit, onCancel, getNextNumero }: RecibiFormInlineProps) {
  const [form, setForm] = useState({
    numero: '',
    fecha: new Date().toISOString().split('T')[0],
    importe: 0,
    concepto: '',
    forma_pago: 'efectivo',
    procedimiento_id: null as string | null,
    notas: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getNextNumero().then(num => setForm(prev => ({ ...prev, numero: num })));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        cliente_id: clienteId,
        procedimiento_id: form.procedimiento_id,
        numero: form.numero,
        fecha: form.fecha,
        importe: form.importe,
        concepto: form.concepto,
        forma_pago: form.forma_pago,
        notas: form.notas || null,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        Este recibí es un documento interno. No tiene valor contable ni sustituye a una factura.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Nº Recibí</label>
          <input type="text" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} className="form-input" readOnly />
        </div>
        <div>
          <label className="form-label">Fecha *</label>
          <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="form-input" required />
        </div>
        <div>
          <label className="form-label">Importe (€) *</label>
          <input type="number" step="0.01" min="0" value={form.importe || ''} onChange={e => setForm({ ...form, importe: parseFloat(e.target.value) || 0 })} className="form-input" required />
        </div>
        <div>
          <label className="form-label">Forma de pago</label>
          <select value={form.forma_pago} onChange={e => setForm({ ...form, forma_pago: e.target.value })} className="form-input">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="bizum">Bizum</option>
            <option value="cheque">Cheque</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Concepto *</label>
          <input type="text" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} className="form-input" required placeholder="Ej: Pago a cuenta por tramitación NIE" />
        </div>
        {procedimientos.length > 0 && (
          <div className="md:col-span-2">
            <label className="form-label">Expediente asociado (opcional)</label>
            <select value={form.procedimiento_id || ''} onChange={e => setForm({ ...form, procedimiento_id: e.target.value || null })} className="form-input">
              <option value="">Sin expediente</option>
              {procedimientos.map(p => (
                <option key={p.id} value={p.id}>{p.titulo} ({p.concepto})</option>
              ))}
            </select>
          </div>
        )}
        <div className="md:col-span-2">
          <label className="form-label">Notas</label>
          <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} className="form-input" rows={2} placeholder="Observaciones..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Generando...' : 'Generar recibí'}
        </button>
      </div>
    </form>
  );
}
