'use client';

import { useState } from 'react';
import type { Gasto } from '@/lib/supabase/types';
import { eur } from '@/lib/utils';
import { formatField } from '@/lib/utils/text';

interface GastoFormProps {
  gasto?: Gasto;
  onSubmit: (data: Omit<Gasto, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
  onUploadFactura?: (file: File) => Promise<string>;
  isDuplicating?: boolean;
}

export function GastoForm({ gasto, onSubmit, onCancel, onUploadFactura, isDuplicating }: GastoFormProps) {
  const [formData, setFormData] = useState({
    fecha: gasto?.fecha || new Date().toISOString().split('T')[0],
    mes: gasto?.mes || new Date().toISOString().slice(0, 7),
    categoria: gasto?.categoria || '',
    proveedor: gasto?.proveedor || '',
    conceptos: gasto?.conceptos.join(', ') || '',
    importe_total: gasto?.importe_total || 0,
    notas: gasto?.notas || '',
    es_recurrente: gasto?.es_recurrente || false,
    periodicidad: gasto?.periodicidad || 'mensual' as Gasto['periodicidad'],
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
        .map(c => formatField(c.trim(), 'general'))
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
          
          // Si el error es de bucket no encontrado, permitir continuar sin factura
          if (uploadError instanceof Error && uploadError.message?.includes('bucket de facturas')) {
            const continuar = confirm(`No se pudo subir la factura porque el bucket no está configurado.\n\n${uploadError.message}\n\n¿Deseas continuar creando el gasto sin factura?`);
            if (!continuar) {
              throw new Error('Creación de gasto cancelada por el usuario.');
            }
            console.log('Usuario decidió continuar sin factura');
          } else {
            throw new Error(`Error al subir la factura: ${uploadError instanceof Error ? uploadError.message : 'Error desconocido'}`);
          }
        }
      }

      const gastoData = {
        ...formData,
        categoria: formatField(formData.categoria, 'general'),
        proveedor: formatField(formData.proveedor, 'name'),
        conceptos: conceptosArray,
        factura_url: finalFacturaUrl,
        numero_factura: null,
        fecha_factura: null,
        notas: formData.notas ? formatField(formData.notas, 'general') : '',
        es_recurrente: formData.es_recurrente,
        periodicidad: formData.es_recurrente ? formData.periodicidad : null,
        gasto_plantilla_id: gasto?.gasto_plantilla_id || null,
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
      {isDuplicating && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-purple-800">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              Estás duplicando un gasto. Se han actualizado la fecha y mes al período actual. 
              Los datos de factura han sido limpiados y deberás subirlos nuevamente si es necesario.
            </span>
          </div>
        </div>
      )}
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

      {/* Recurrencia */}
      <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={formData.es_recurrente || false}
            onChange={e => setFormData(prev => ({ ...prev, es_recurrente: e.target.checked }))}
          />
          <span className="text-sm font-medium text-amber-800">Gasto recurrente</span>
        </label>
        {formData.es_recurrente && (
          <div className="ml-6">
            <label className="block text-xs text-gray-600 mb-1">Periodicidad</label>
            <select
              className="form-input text-sm"
              value={formData.periodicidad || 'mensual'}
              onChange={e => setFormData(prev => ({ ...prev, periodicidad: e.target.value as Gasto['periodicidad'] }))}
            >
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="bimestral">Bimestral (cada 2 meses)</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
            <p className="text-xs text-amber-700 mt-1">Se mostrará como pendiente de confirmar cada período</p>
          </div>
        )}
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
          {loading ? 'Guardando...' : isDuplicating ? 'Crear copia' : gasto ? 'Actualizar' : 'Crear'} Gasto
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
