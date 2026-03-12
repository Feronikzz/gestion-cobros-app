'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutShell } from '@/components/layout-shell';
import { createClient } from '@/lib/supabase/client';
import { eur } from '@/lib/utils';
import type { Factura } from '@/lib/supabase/types';
import { ArrowLeft, Printer, Download, FileText, Building2, User, Calendar } from 'lucide-react';

export default function FacturaViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = useParams<{ id: string }>();
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

          {/* Factura - Diseño Profesional */}
          <div style={{ 
            background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)', 
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '300px',
              height: '300px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)',
              borderRadius: '0 0 0 300px',
              zIndex: 0
            }} />
            
            <div style={{ 
              padding: '4rem',
              position: 'relative',
              zIndex: 1,
              fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              
              {/* Header with asymmetric layout */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '4rem'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      borderRadius: '50%'
                    }} />
                    <h1 style={{ 
                      fontSize: '3rem', 
                      fontWeight: '700', 
                      color: '#111827', 
                      margin: 0, 
                      letterSpacing: '-0.02em',
                      background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>FACTURA</h1>
                  </div>
                  <p style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '500', 
                    color: '#6b7280', 
                    margin: 0,
                    letterSpacing: '0.05em'
                  }}>{factura.numero}</p>
                </div>
                
                <div style={{ 
                  textAlign: 'right',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(229, 231, 235, 0.5)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Calendar style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontWeight: '500' }}>Fecha de emisión</p>
                  </div>
                  <p style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '600', 
                    color: '#111827', 
                    margin: 0 
                  }}>
                    {new Date(factura.fecha).toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

            {/* Emisor y Receptor - Cards con diseño moderno */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '2rem',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <Building2 style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                  <h3 style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: '#374151', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    margin: 0 
                  }}>Emisor</h3>
                </div>
                <div style={{ fontSize: '0.9375rem', lineHeight: '1.7' }}>
                  <p style={{ 
                    fontWeight: '600', 
                    color: '#111827', 
                    marginBottom: '0.5rem',
                    fontSize: '1.0625rem'
                  }}>{factura.emisor_nombre}</p>
                  <p style={{ color: '#6b7280', marginBottom: '0.25rem' }}>NIF/CIF: {factura.emisor_nif}</p>
                  <p style={{ color: '#6b7280' }}>{factura.emisor_direccion}</p>
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '2rem',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <User style={{ width: '20px', height: '20px', color: '#10b981' }} />
                  <h3 style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: '#374151', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    margin: 0 
                  }}>Receptor</h3>
                </div>
                <div style={{ fontSize: '0.9375rem', lineHeight: '1.7' }}>
                  <p style={{ 
                    fontWeight: '600', 
                    color: '#111827', 
                    marginBottom: '0.5rem',
                    fontSize: '1.0625rem'
                  }}>{factura.receptor_nombre}</p>
                  {factura.receptor_nif && <p style={{ color: '#6b7280', marginBottom: '0.25rem' }}>NIF/CIF: {factura.receptor_nif}</p>}
                  {factura.receptor_direccion && <p style={{ color: '#6b7280' }}>{factura.receptor_direccion}</p>}
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

            {/* Líneas - Tabla moderna */}
            <div style={{ marginBottom: '3rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ 
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)',
                      borderBottom: '2px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '1.25rem 1.5rem', 
                        fontSize: '0.8125rem', 
                        fontWeight: '600', 
                        color: '#3730a3', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        borderRight: '1px solid rgba(229, 231, 235, 0.3)'
                      }}>Descripción</th>
                      <th style={{ 
                        textAlign: 'center', 
                        padding: '1.25rem 1rem', 
                        fontSize: '0.8125rem', 
                        fontWeight: '600', 
                        color: '#3730a3', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        width: '6rem',
                        borderRight: '1px solid rgba(229, 231, 235, 0.3)'
                      }}>Cant.</th>
                      <th style={{ 
                        textAlign: 'right', 
                        padding: '1.25rem 1rem', 
                        fontSize: '0.8125rem', 
                        fontWeight: '600', 
                        color: '#3730a3', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        width: '8rem',
                        borderRight: '1px solid rgba(229, 231, 235, 0.3)'
                      }}>Precio</th>
                      <th style={{ 
                        textAlign: 'right', 
                        padding: '1.25rem 1.5rem', 
                        fontSize: '0.8125rem', 
                        fontWeight: '600', 
                        color: '#3730a3', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        width: '8rem'
                      }}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factura.lineas.map((linea, idx) => (
                      <tr key={idx} style={{ 
                        borderBottom: idx < factura.lineas.length - 1 ? '1px solid rgba(229, 231, 235, 0.3)' : 'none',
                        backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(249, 250, 251, 0.5)',
                        transition: 'background-color 0.2s ease'
                      }}>
                        <td style={{ 
                          padding: '1.25rem 1.5rem', 
                          fontSize: '0.9375rem', 
                          color: '#111827', 
                          verticalAlign: 'top',
                          fontWeight: '500',
                          borderRight: '1px solid rgba(229, 231, 235, 0.3)'
                        }}>{linea.descripcion}</td>
                        <td style={{ 
                          padding: '1.25rem 1rem', 
                          fontSize: '0.9375rem', 
                          textAlign: 'center', 
                          color: '#6b7280',
                          fontWeight: '500',
                          borderRight: '1px solid rgba(229, 231, 235, 0.3)'
                        }}>{linea.cantidad}</td>
                        <td style={{ 
                          padding: '1.25rem 1rem', 
                          fontSize: '0.9375rem', 
                          textAlign: 'right', 
                          color: '#6b7280',
                          fontWeight: '500',
                          borderRight: '1px solid rgba(229, 231, 235, 0.3)'
                        }}>{eur(linea.precio_unitario)}</td>
                        <td style={{ 
                          padding: '1.25rem 1.5rem', 
                          fontSize: '1rem', 
                          textAlign: 'right', 
                          fontWeight: '600', 
                          color: '#111827',
                          fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace'
                        }}>{eur(linea.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totales - Diseño moderno */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
              <div style={{
                width: '24rem',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {/* Decorative gradient top */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%)'
                }} />
                
                <div style={{ padding: '0.25rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '1.25rem 1.5rem', 
                    fontSize: '0.9375rem',
                    borderBottom: '1px solid rgba(229, 231, 235, 0.3)'
                  }}>
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>Base imponible</span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: '#111827',
                      fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace'
                    }}>{eur(factura.base_imponible)}</span>
                  </div>
                  
                  {factura.incluir_iva && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '1.25rem 1.5rem', 
                      fontSize: '0.9375rem',
                      borderBottom: factura.incluir_irpf ? '1px solid rgba(229, 231, 235, 0.3)' : 'none'
                    }}>
                      <span style={{ color: '#6b7280', fontWeight: '500' }}>IVA ({factura.iva_porcentaje}%)</span>
                      <span style={{ 
                        fontWeight: '600', 
                        color: '#059669',
                        fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace'
                      }}>+{eur(factura.iva_importe)}</span>
                    </div>
                  )}
                  
                  {factura.incluir_irpf && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '1.25rem 1.5rem', 
                      fontSize: '0.9375rem',
                      borderBottom: '1px solid rgba(229, 231, 235, 0.3)'
                    }}>
                      <span style={{ color: '#6b7280', fontWeight: '500' }}>IRPF (-{factura.irpf_porcentaje}%)</span>
                      <span style={{ 
                        fontWeight: '600', 
                        color: '#dc2626',
                        fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace'
                      }}>-{eur(factura.irpf_importe)}</span>
                    </div>
                  )}
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '1.5rem 1.5rem', 
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.02) 100%)',
                    borderTop: '2px solid rgba(59, 130, 246, 0.2)',
                    marginTop: '0.25rem'
                  }}>
                    <span style={{ 
                      fontSize: '1.125rem', 
                      fontWeight: '700', 
                      color: '#111827',
                      letterSpacing: '0.025em'
                    }}>TOTAL</span>
                    <span style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700', 
                      color: '#111827',
                      fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
                      background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>{eur(factura.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notas */}
            {factura.notas && (
              <div style={{ 
                marginTop: '3rem', 
                paddingTop: '2rem', 
                borderTop: '1px solid #e5e7eb',
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '2rem'
              }}>
                <h3 style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '600', 
                  color: '#6b7280', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em', 
                  marginBottom: '1rem' 
                }}>Notas adicionales</h3>
                <p style={{ fontSize: '0.9375rem', color: '#374151', lineHeight: '1.6', margin: 0 }}>{factura.notas}</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
