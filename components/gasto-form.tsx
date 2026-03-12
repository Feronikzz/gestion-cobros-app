'use client';

import { useState } from 'react';
import type { Gasto } from '@/lib/supabase/types';
import { eur } from '@/lib/utils';

interface GastoFormProps {
  gasto?: Gasto;
  onSubmit: (data: Omit<Gasto, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
  onUploadFactura?: (file: File) => Promise<string>;
}

export function GastoForm({ gasto, onSubmit, onCancel, onUploadFactura }: GastoFormProps) {
  const [formData, setFormData] = useState({
    fecha: gasto?.fecha || new Date().toISOString().split('T')[0],
    mes: gasto?.mes || new Date().toISOString().slice(0, 7),
    categoria: gasto?.categoria || '',
    proveedor: gasto?.proveedor || '',
    conceptos: gasto?.conceptos.join(', ') || '',
    importe_total: gasto?.importe_total || 0,
    notas: gasto?.notas || ''
  });
  const [loading, setLoading] = useState(false);
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [facturaUrl, setFacturaUrl] = useState<string | null>(gasto?.factura_url || null);

  const categorias = [
    'Suministros',
    'Alquiler', 
    'Material',
    'Servicios',
    'Impuestos',
    'Marketing',
    'Transporte',
    'Otros'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Iniciando submit del formulario de gasto');
      
      const conceptosArray = formData.conceptos
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      console.log('Conceptos procesados:', conceptosArray);
      console.log('Factura file:', facturaFile);
      console.log('Factura URL existente:', facturaUrl);

      let finalFacturaUrl = facturaUrl;

      // Si hay un nuevo archivo de factura, subirlo
      if (facturaFile && onUploadFactura) {
        console.log('Subiendo nueva factura:', facturaFile.name);
        try {
          finalFacturaUrl = await onUploadFactura(facturaFile);
          console.log('Factura subida exitosamente:', finalFacturaUrl);
        } catch (uploadError) {
          console.error('Error al subir factura:', uploadError);
          throw new Error(`Error al subir la factura: ${uploadError instanceof Error ? uploadError.message : 'Error desconocido'}`);
        }
      }

      const gastoData = {
        ...formData,
        conceptos: conceptosArray,
        factura_url: finalFacturaUrl,
        numero_factura: '', // Campo vacío ya que no se necesita
        fecha_factura: '' // Campo vacío ya que no se necesita
      };

      console.log('Datos finales del gasto:', gastoData);
      await onSubmit(gastoData);
      console.log('Gasto enviado exitosamente');
    } catch (error) {
      console.error('Error completo en handleSubmit:', error);
      throw error; // Re-lanzar el error para que lo maneje el componente padre
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'importe_total' ? parseFloat(value) || 0 : value
    }));
  };

  const handleFacturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFacturaFile(file);
    }
  };

  const removeFactura = () => {
    setFacturaFile(null);
    setFacturaUrl(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha del gasto
          </label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleInputChange}
            className="form-input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mes contable
          </label>
          <input
            type="month"
            name="mes"
            value={formData.mes}
            onChange={handleInputChange}
            className="form-input"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleInputChange}
            className="form-input"
            required
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor
          </label>
          <input
            type="text"
            name="proveedor"
            value={formData.proveedor}
            onChange={handleInputChange}
            placeholder="Nombre del proveedor"
            className="form-input"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Conceptos (separados por comas)
        </label>
        <textarea
          name="conceptos"
          value={formData.conceptos}
          onChange={handleInputChange}
          placeholder="Concepto 1, Concepto 2, Concepto 3..."
          rows={3}
          className="form-input"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Importe total
          </label>
          <input
            type="number"
            name="importe_total"
            value={formData.importe_total.toFixed(2)}
            onChange={handleInputChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="form-input"
            required
          />
        </div>

        </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Factura (PDF o imagen)
        </label>
        <div className="space-y-2">
          {facturaUrl ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">
                {facturaFile?.name || 'Factura existente'}
              </span>
              <button
                type="button"
                onClick={removeFactura}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Eliminar
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFacturaChange}
              className="form-input"
            />
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas
        </label>
        <textarea
          name="notas"
          value={formData.notas}
          onChange={handleInputChange}
          placeholder="Notas adicionales..."
          rows={2}
          className="form-input"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary flex-1"
        >
          {loading ? 'Guardando...' : gasto ? 'Actualizar' : 'Crear'} Gasto
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
