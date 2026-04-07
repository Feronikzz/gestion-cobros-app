'use client';

import { useState, useRef } from 'react';
import type { Cliente, Recibi } from '@/lib/supabase/types';
import { Printer, Download } from 'lucide-react';

interface RecibiGeneratorProps {
  cliente: Cliente;
  recibi: Recibi;
  emisorNombre?: string;
  emisorNif?: string;
  emisorDireccion?: string;
}

export function RecibiGenerator({ cliente, recibi, emisorNombre, emisorNif, emisorDireccion }: RecibiGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Recibí ${recibi.numero}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
        .recibi { max-width: 700px; margin: 0 auto; border: 2px solid #1e293b; padding: 40px; }
        .recibi-header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
        .recibi-header h1 { font-size: 28px; letter-spacing: 4px; margin: 0 0 8px 0; text-transform: uppercase; }
        .recibi-numero { font-size: 14px; color: #64748b; }
        .recibi-body { line-height: 2; font-size: 15px; }
        .recibi-field { font-weight: 600; border-bottom: 1px dotted #94a3b8; padding: 0 4px; }
        .recibi-importe { font-size: 24px; font-weight: 700; text-align: center; margin: 30px 0; padding: 15px; border: 1px solid #e2e8f0; background: #f8fafc; }
        .recibi-footer { margin-top: 60px; display: flex; justify-content: space-between; }
        .recibi-firma { width: 200px; text-align: center; }
        .recibi-firma-line { border-top: 1px solid #1e293b; margin-top: 60px; padding-top: 8px; font-size: 12px; color: #64748b; }
        .recibi-date { text-align: right; margin-top: 30px; font-size: 13px; color: #64748b; }
        .recibi-nota { margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 4px; font-size: 12px; color: #64748b; text-align: center; font-style: italic; }
      </style>
      </head><body>
        ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatImporte = (n: number) =>
    n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const importeEnLetras = (n: number): string => {
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales: Record<number, string> = { 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve', 21: 'veintiún', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve' };
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    const entero = Math.floor(n);
    const decimales = Math.round((n - entero) * 100);

    const convertir = (num: number): string => {
      if (num === 0) return 'cero';
      if (num === 100) return 'cien';
      if (num < 10) return unidades[num];
      if (especiales[num]) return especiales[num];
      if (num < 100) {
        const d = Math.floor(num / 10);
        const u = num % 10;
        return u === 0 ? decenas[d] : `${decenas[d]} y ${unidades[u]}`;
      }
      if (num < 1000) {
        const c = Math.floor(num / 100);
        const resto = num % 100;
        return resto === 0 ? centenas[c] : `${centenas[c]} ${convertir(resto)}`;
      }
      if (num < 1000000) {
        const miles = Math.floor(num / 1000);
        const resto = num % 1000;
        const milesStr = miles === 1 ? 'mil' : `${convertir(miles)} mil`;
        return resto === 0 ? milesStr : `${milesStr} ${convertir(resto)}`;
      }
      return num.toString();
    };

    const parteEntera = convertir(entero);
    const result = decimales > 0
      ? `${parteEntera} euros con ${convertir(decimales)} céntimos`
      : `${parteEntera} euros`;

    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  const fechaFormateada = new Date(recibi.fecha).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const nombreCompleto = [cliente.nombre, cliente.apellidos].filter(Boolean).join(' ');

  return (
    <div>
      {/* Botones de acción */}
      <div className="flex gap-2 mb-4">
        <button onClick={handlePrint} className="btn btn-primary btn-sm flex items-center gap-2">
          <Printer className="w-4 h-4" /> Imprimir / Descargar PDF
        </button>
      </div>

      {/* Contenido del recibí */}
      <div ref={printRef}>
        <div className="recibi" style={{ maxWidth: '700px', margin: '0 auto', border: '2px solid #1e293b', padding: '40px', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '20px', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '28px', letterSpacing: '4px', margin: '0 0 8px 0', textTransform: 'uppercase' as const }}>RECIBÍ</h1>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Nº {recibi.numero}</div>
          </div>

          {/* Cuerpo */}
          <div style={{ lineHeight: 2, fontSize: '15px' }}>
            <p>
              {emisorNombre && (
                <>
                  <span style={{ fontWeight: 600 }}>{emisorNombre}</span>
                  {emisorNif && <>, con NIF <span style={{ fontWeight: 600 }}>{emisorNif}</span></>}
                  {emisorDireccion && <>, con domicilio en <span style={{ fontWeight: 600 }}>{emisorDireccion}</span></>}
                  ,{' '}
                </>
              )}
              declara haber recibido de <span style={{ fontWeight: 600 }}>{nombreCompleto}</span>
              {cliente.nif && <>, con documento de identidad nº <span style={{ fontWeight: 600 }}>{cliente.nif}</span></>}
              , la cantidad de:
            </p>

            <div style={{ fontSize: '24px', fontWeight: 700, textAlign: 'center', margin: '30px 0', padding: '15px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {formatImporte(recibi.importe)} €
            </div>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '-15px', marginBottom: '20px' }}>
              ({importeEnLetras(recibi.importe)})
            </p>

            <p>
              En concepto de: <span style={{ fontWeight: 600 }}>{recibi.concepto}</span>
            </p>
            <p>
              Forma de pago: <span style={{ fontWeight: 600 }}>{recibi.forma_pago}</span>
            </p>
          </div>

          {/* Fecha */}
          <div style={{ textAlign: 'right', marginTop: '30px', fontSize: '13px', color: '#64748b' }}>
            A {fechaFormateada}
          </div>

          {/* Firmas */}
          <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '200px', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #1e293b', marginTop: '60px', paddingTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Firma del receptor
              </div>
            </div>
            <div style={{ width: '200px', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #1e293b', marginTop: '60px', paddingTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Firma del emisor
              </div>
            </div>
          </div>

          {/* Nota legal */}
          <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '4px', fontSize: '12px', color: '#64748b', textAlign: 'center', fontStyle: 'italic' }}>
            Este recibí no tiene valor contable ni sustituye a una factura.
            Documento generado con fines de control interno exclusivamente.
          </div>
        </div>
      </div>
    </div>
  );
}
