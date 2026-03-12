'use client';

import { useState, useEffect } from 'react';
import type { Cobro, Cliente, Procedimiento } from '@/lib/supabase/types';
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
    iva_tipo: cobro?.iva_tipo || 'sin_iva' as 'sin_iva' | 'iva_incluido' | 'iva_sobre_precio',
    iva_porcentaje: cobro?.iva_porcentaje || 21,
  });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [avisoSuperacion, setAvisoSuperacion] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteIdFijo) {
      const supabase = createClient();
      supabase.from('clientes').select('*').order('nombre').then(({ data }) => setClientes(data || []));
    }
  }, [clienteIdFijo]);

  useEffect(() => {
    const supabase = createClient();
    // Cargar procedimientos del cliente seleccionado
    if (formData.cliente_id) {
      supabase
        .from('procedimientos')
        .select('*')
        .eq('cliente_id', formData.cliente_id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setProcedimientos(data || []));
    } else {
      setProcedimientos([]);
    }
  }, [formData.cliente_id]);

  // Verificar si el importe supera el pendiente
  useEffect(() => {
    const verificarSuperacion = async () => {
      if (!formData.procedimiento_id || formData.importe <= 0) {
        setAvisoSuperacion(null);
        return;
      }

      const supabase = createClient();
      
      // Obtener datos del procedimiento
      const { data: procedimiento } = await supabase
        .from('procedimientos')
        .select('*')
        .eq('id', formData.procedimiento_id)
        .single();

      if (!procedimiento) return;

      // Obtener cobros existentes del procedimiento
      const { data: cobrosExistentes } = await supabase
        .from('cobros')
        .select('*')
        .eq('procedimiento_id', formData.procedimiento_id);

      // Calcular pendiente
      const totalCobrado = cobrosExistentes?.reduce((sum, c) => sum + c.importe, 0) || 0;
      const entradas = procedimiento.tiene_entrada ? procedimiento.importe_entrada : 0;
      
      // Verificar si la entrada ya está incluida en los cobros
      const entradaYaCobrada = cobrosExistentes?.some(c => 
        c.notas && c.notas.includes('Entrada del procedimiento')
      );
      
      const totalPagado = totalCobrado + (procedimiento.tiene_entrada && !entradaYaCobrada ? entradas : 0);
      const pendiente = procedimiento.presupuesto - totalPagado;

      // Si estamos editando, restar el importe original del cobro
      const importeActual = cobro ? cobro.importe : 0;
      const pendienteConCobroActual = pendiente + importeActual;

      if (formData.importe > pendienteConCobroActual) {
        setAvisoSuperacion(
          `⚠️ El importe (${formData.importe.toFixed(2)}€) supera el pendiente del procedimiento (${pendienteConCobroActual.toFixed(2)}€). ` +
          `El exceso sería de ${(formData.importe - pendienteConCobroActual).toFixed(2)}€.`
        );
      } else {
        setAvisoSuperacion(null);
      }
    };

    verificarSuperacion();
  }, [formData.importe, formData.procedimiento_id, cobro]);

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
          <label className="form-label">Expediente/Procedimiento</label>
          <select 
            value={formData.procedimiento_id || ''} 
            onChange={(e) => setFormData({ ...formData, procedimiento_id: e.target.value || null })} 
            className="form-input"
          >
            <option value="">Sin expediente asignado</option>
            {procedimientos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo} - {p.estado} ({p.presupuesto}€)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Importe *</label>
          <input type="number" step="0.01" min="0" value={formData.importe} onChange={(e) => setFormData({ ...formData, importe: parseFloat(e.target.value) || 0 })} className="form-input" required />
          {avisoSuperacion && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium">{avisoSuperacion}</p>
            </div>
          )}
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
        <div>
          <label className="form-label">IVA</label>
          <select 
            value={formData.iva_tipo} 
            onChange={(e) => setFormData({ ...formData, iva_tipo: e.target.value as 'sin_iva' | 'iva_incluido' | 'iva_sobre_precio' })} 
            className="form-input"
          >
            <option value="sin_iva">Sin IVA</option>
            <option value="iva_incluido">IVA incluido en el precio</option>
            <option value="iva_sobre_precio">IVA sobre el precio</option>
          </select>
          {(formData.iva_tipo === 'iva_incluido' || formData.iva_tipo === 'iva_sobre_precio') && (
            <div className="mt-2">
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={formData.iva_porcentaje} 
                onChange={(e) => setFormData({ ...formData, iva_porcentaje: parseFloat(e.target.value) || 0 })} 
                className="form-input" 
                placeholder="Porcentaje de IVA" 
              />
            </div>
          )}
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
