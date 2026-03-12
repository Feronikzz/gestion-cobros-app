'use client';

import { useState, useEffect } from 'react';
import type { Cobro, Cliente } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';

interface CobroFormProps {
  cobro?: Cobro;
  clienteIdFijo?: string;
  onSubmit: (cobro: Omit<Cobro, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
}

export function CobroForm({ cobro, clienteIdFijo, onSubmit, onCancel }: CobroFormProps) {
  const [formData, setFormData] = useState({
    cliente_id: cobro?.cliente_id || clienteIdFijo || '',
    procedimiento_id: cobro?.procedimiento_id || null as string | null,
    fecha_cobro: cobro?.fecha_cobro || new Date().toISOString().split('T')[0],
    importe: cobro?.importe || 0,
    metodo_pago: cobro?.metodo_pago || 'transferencia',
    notas: cobro?.notas || '',
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clienteIdFijo) {
      const supabase = createClient();
      supabase.from('clientes').select('*').order('nombre').then(({ data }) => setClientes(data || []));
    }
  }, [clienteIdFijo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!clienteIdFijo && (
          <div>
            <label className="form-label">Cliente *</label>
            <select value={formData.cliente_id} onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })} className="form-input" required>
              <option value="">Seleccionar cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.nif ? `(${c.nif})` : ''}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="form-label">Fecha del cobro *</label>
          <input type="date" value={formData.fecha_cobro} onChange={(e) => setFormData({ ...formData, fecha_cobro: e.target.value })} className="form-input" required />
        </div>
        <div>
          <label className="form-label">Importe *</label>
          <input type="number" step="0.01" min="0" value={formData.importe} onChange={(e) => setFormData({ ...formData, importe: parseFloat(e.target.value) || 0 })} className="form-input" required />
        </div>
        <div>
          <label className="form-label">Método de pago *</label>
          <select value={formData.metodo_pago} onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })} className="form-input">
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="bizum">Bizum</option>
            <option value="cheque">Cheque</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="form-label">Notas</label>
          <textarea value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} className="form-input" rows={2} placeholder="Observaciones..." />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : cobro ? 'Actualizar' : 'Registrar cobro'}
        </button>
      </div>
    </form>
  );
}
