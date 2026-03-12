'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { eur } from '@/lib/utils';
import type { Factura } from '@/lib/supabase/types';
import { ArrowLeft, Download, Printer } from 'lucide-react';

export default function FacturaViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFactura = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching factura:', error);
      } else {
        setFactura(data);
      }
      setLoading(false);
    };

    fetchFactura();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Cargando factura...</div>
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Factura no encontrada</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .factura-container { box-shadow: none !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Actions bar */}
          <div className="no-print mb-6 flex items-center justify-between">
            <button onClick={() => router.back()} className="btn btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <div className="flex gap-3">
              <button onClick={handlePrint} className="btn btn-secondary">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button onClick={handleDownload} className="btn btn-primary">
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
            </div>
          </div>

          {/* Factura */}
          <div className="factura-container bg-white shadow-lg rounded-lg p-12">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">FACTURA</h1>
                <p className="text-xl font-semibold text-gray-700">{factura.numero}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="text-lg font-semibold">{new Date(factura.fecha).toLocaleDateString('es-ES')}</p>
              </div>
            </div>

            {/* Emisor y Receptor */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Emisor</h3>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{factura.emisor_nombre}</p>
                  <p className="text-gray-600">NIF/CIF: {factura.emisor_nif}</p>
                  {factura.emisor_direccion && <p className="text-gray-600">{factura.emisor_direccion}</p>}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Receptor</h3>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{factura.receptor_nombre}</p>
                  {factura.receptor_nif && <p className="text-gray-600">NIF/CIF: {factura.receptor_nif}</p>}
                  {factura.receptor_direccion && <p className="text-gray-600">{factura.receptor_direccion}</p>}
                </div>
              </div>
            </div>

            {/* Tipo de factura */}
            {factura.tipo !== 'normal' && (
              <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-semibold text-yellow-800">
                  {factura.tipo === 'rectificativa' ? '⚠️ Factura Rectificativa' : 'ℹ️ Factura No Contable'}
                </p>
                {factura.motivo_rectificacion && (
                  <p className="text-sm text-yellow-700 mt-1">Motivo: {factura.motivo_rectificacion}</p>
                )}
              </div>
            )}

            {/* Líneas */}
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Descripción</th>
                    <th className="text-center py-3 text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Cant.</th>
                    <th className="text-right py-3 text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Precio</th>
                    <th className="text-right py-3 text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.lineas.map((linea, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-3 text-sm text-gray-900">{linea.descripcion}</td>
                      <td className="py-3 text-sm text-center text-gray-700">{linea.cantidad}</td>
                      <td className="py-3 text-sm text-right text-gray-700">{eur(linea.precio_unitario)}</td>
                      <td className="py-3 text-sm text-right font-medium text-gray-900">{eur(linea.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-80">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-600">Base imponible:</span>
                  <span className="font-medium text-gray-900">{eur(factura.base_imponible)}</span>
                </div>
                {factura.incluir_iva && (
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">IVA ({factura.iva_porcentaje}%):</span>
                    <span className="font-medium text-gray-900">{eur(factura.iva_importe)}</span>
                  </div>
                )}
                {factura.incluir_irpf && (
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">IRPF (-{factura.irpf_porcentaje}%):</span>
                    <span className="font-medium text-red-600">-{eur(factura.irpf_importe)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-t-2 border-gray-300 mt-2">
                  <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                  <span className="text-lg font-bold text-gray-900">{eur(factura.total)}</span>
                </div>
              </div>
            </div>

            {/* Notas */}
            {factura.notas && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notas</h3>
                <p className="text-sm text-gray-700">{factura.notas}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
