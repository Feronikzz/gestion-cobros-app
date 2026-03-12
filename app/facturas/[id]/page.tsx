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

      <div className="min-h-screen bg-gray-50 py-8 px-4" style={{ backgroundColor: 'var(--color-background)' }}>
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
          <div className="factura-container" style={{ 
          background: 'white', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
          borderRadius: '8px', 
          padding: '2rem',
          border: '1px solid #e5e7eb'
        }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #1f2937', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', margin: 0, marginBottom: '0.25rem' }}>FACTURA</h1>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#6b7280', margin: 0 }}>{factura.numero}</p>
                  {factura.tipo === 'rectificativa' && (
                    <p style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.5rem' }}>
                      FACTURA RECTIFICATIVA - {factura.motivo_rectificacion}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Fecha</p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: '0.25rem 0' }}>
                    {new Date(factura.fecha).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
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
            <div style={{ marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #374151' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripción</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '5rem' }}>Cant.</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '7rem' }}>Precio</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: '7rem' }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.lineas.map((linea, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#1f2937', verticalAlign: 'top' }}>{linea.descripcion}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', textAlign: 'center', color: '#6b7280' }}>{linea.cantidad}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', textAlign: 'right', color: '#6b7280' }}>{eur(linea.precio_unitario)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '600', color: '#1f2937' }}>{eur(linea.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <div style={{ width: '20rem', borderTop: '2px solid #374151', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Base imponible:</span>
                  <span style={{ fontWeight: '500', color: '#1f2937' }}>{eur(factura.base_imponible)}</span>
                </div>
                {factura.incluir_iva && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>IVA ({factura.iva_porcentaje}%):</span>
                    <span style={{ fontWeight: '500', color: '#1f2937' }}>{eur(factura.iva_importe)}</span>
                  </div>
                )}
                {factura.incluir_irpf && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6b7280' }}>IRPF (-{factura.irpf_porcentaje}%):</span>
                    <span style={{ fontWeight: '500', color: '#dc2626' }}>-{eur(factura.irpf_importe)}</span>
                  </div>
                )}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem 0', 
                  marginTop: '0.5rem',
                  borderTop: '2px solid #374151',
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  color: '#1f2937'
                }}>
                  <span>TOTAL:</span>
                  <span>{eur(factura.total)}</span>
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
