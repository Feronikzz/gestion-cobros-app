'use client';

import { useState } from 'react';
import type { Reparto } from '@/lib/supabase/types';

interface RepartoFormProps {
  reparto?: Reparto;
  onSubmit: (reparto: Omit<Reparto, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIAS = [
  'Sueldos',
  'Alquiler',
  'Suministros',
  'Material',
  'Servicios',
  'Impuestos',
  'Marketing',
  'Transporte',
  'Otros'
];

export function RepartoForm({ reparto, onSubmit, onCancel }: RepartoFormProps) {
  const [formData, setFormData] = useState({
    fecha: reparto?.fecha || new Date().toISOString().split('T')[0],
    mes: reparto?.mes || new Date().toISOString().slice(0, 7),
    categoria: reparto?.categoria || 'Otros',
    destinatario: reparto?.destinatario || '',
    concepto: reparto?.concepto || '',
    importe: reparto?.importe || 0,
    notas: reparto?.notas || '',
  });
  const [loading, setLoading] = useState(false);

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha *
          </label>
          <input
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            className="form-input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mes contable *
          </label>
          <input
            type="month"
            value={formData.mes}
            onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
            className="form-input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría *
          </label>
          <select
            value={formData.categoria}
            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            className="form-input"
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destinatario *
          </label>
          <input
            type="text"
            value={formData.destinatario}
            onChange={(e) => setFormData({ ...formData, destinatario: e.target.value })}
            className="form-input"
            placeholder="Nombre del destinatario"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Concepto *
          </label>
          <input
            type="text"
            value={formData.concepto}
            onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
            className="form-input"
            placeholder="Descripción del reparto"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Importe *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.importe}
            onChange={(e) => setFormData({ ...formData, importe: parseFloat(e.target.value) || 0 })}
            className="form-input"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas
          </label>
          <textarea
            value={formData.notas}
            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            className="form-input"
            rows={3}
            placeholder="Observaciones sobre el reparto..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Guardando...' : reparto ? 'Actualizar' : 'Registrar'}
        </button>
      </div>
    </form>
  );
}
