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
          background: '#ffffff', 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', 
          borderRadius: '0', 
          padding: '3rem',
          border: 'none',
          fontFamily: 'Arial, sans-serif',
          color: '#000000'
        }}>
            {/* Header */}
            <div style={{ borderBottom: '3px solid #000000', paddingBottom: '1.5rem', marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#000000', margin: 0, marginBottom: '0.5rem', letterSpacing: '2px' }}>FACTURA</h1>
                  <p style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', margin: 0 }}>{factura.numero}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, marginBottom: '0.25rem' }}>Fecha</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#000000', margin: 0 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
              <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>EMISOR</h3>
                <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                  <p style={{ fontWeight: '600', color: '#000000', marginBottom: '0.25rem' }}>{factura.emisor_nombre}</p>
                  <p style={{ color: '#374151', marginBottom: '0.25rem' }}>NIF/CIF: {factura.emisor_nif}</p>
                  <p style={{ color: '#374151' }}>{factura.emisor_direccion}</p>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>RECEPTOR</h3>
                <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                  <p style={{ fontWeight: '600', color: '#000000', marginBottom: '0.25rem' }}>{factura.receptor_nombre}</p>
                  {factura.receptor_nif && <p style={{ color: '#374151', marginBottom: '0.25rem' }}>NIF/CIF: {factura.receptor_nif}</p>}
                  {factura.receptor_direccion && <p style={{ color: '#374151' }}>{factura.receptor_direccion}</p>}
                </div>
              </div>
            </div>

            {/* Tipo de factura - Solo mostrar rectificativas */}
            {factura.tipo === 'rectificativa' && (
              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d97706', margin: 0 }}>
                  ⚠️ FACTURA RECTIFICATIVA
                </p>
                {factura.motivo_rectificacion && (
                  <p style={{ fontSize: '0.875rem', color: '#92400e', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                    Motivo: {factura.motivo_rectificacion}
                  </p>
                )}
              </div>
            )}

            {/* Líneas */}
            <div style={{ marginBottom: '3rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #374151' }}>
                    <th style={{ textAlign: 'left', padding: '1rem 0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #d1d5db' }}>Descripción</th>
                    <th style={{ textAlign: 'center', padding: '1rem 0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', width: '6rem', borderRight: '1px solid #d1d5db' }}>Cant.</th>
                    <th style={{ textAlign: 'right', padding: '1rem 0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', width: '8rem', borderRight: '1px solid #d1d5db' }}>Precio</th>
                    <th style={{ textAlign: 'right', padding: '1rem 0.75rem', fontSize: '0.875rem', fontWeight: '600', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', width: '8rem' }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.lineas.map((linea, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #d1d5db', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td style={{ padding: '1rem 0.75rem', fontSize: '0.9375rem', color: '#111827', verticalAlign: 'top', borderRight: '1px solid #d1d5db' }}>{linea.descripcion}</td>
                      <td style={{ padding: '1rem 0.75rem', fontSize: '0.9375rem', textAlign: 'center', color: '#374151', borderRight: '1px solid #d1d5db' }}>{linea.cantidad}</td>
                      <td style={{ padding: '1rem 0.75rem', fontSize: '0.9375rem', textAlign: 'right', color: '#374151', borderRight: '1px solid #d1d5db' }}>{eur(linea.precio_unitario)}</td>
                      <td style={{ padding: '1rem 0.75rem', fontSize: '0.9375rem', textAlign: 'right', fontWeight: '600', color: '#111827' }}>{eur(linea.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
              <div style={{ width: '22rem', border: '2px solid #000000', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem', fontSize: '0.9375rem', borderBottom: '1px solid #d1d5db' }}>
                  <span style={{ color: '#374151', fontWeight: '500' }}>Base imponible:</span>
                  <span style={{ fontWeight: '600', color: '#111827' }}>{eur(factura.base_imponible)}</span>
                </div>
                {factura.incluir_iva && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem', fontSize: '0.9375rem', borderBottom: factura.incluir_irpf ? '1px solid #d1d5db' : 'none' }}>
                    <span style={{ color: '#374151', fontWeight: '500' }}>IVA ({factura.iva_porcentaje}%):</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>{eur(factura.iva_importe)}</span>
                  </div>
                )}
                {factura.incluir_irpf && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem', fontSize: '0.9375rem', borderBottom: '1px solid #d1d5db' }}>
                    <span style={{ color: '#374151', fontWeight: '500' }}>IRPF (-{factura.irpf_porcentaje}%):</span>
                    <span style={{ fontWeight: '600', color: '#dc2626' }}>-{eur(factura.irpf_importe)}</span>
                  </div>
                )}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '1.25rem 1.25rem', 
                  backgroundColor: '#f3f4f6',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#111827',
                  borderTop: '3px solid #000000'
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
