'use client';

import { useState, useRef } from 'react';
import type { Cliente, Recibi } from '@/lib/supabase/types';
import { Printer, Image, X } from 'lucide-react';

const LOGO_STORAGE_KEY = 'recibi_logo_b64';

interface RecibiGeneratorProps {
  cliente: Cliente;
  recibi: Recibi;
  emisorNombre?: string;
  emisorNif?: string;
  emisorDireccion?: string;
}

function importeEnLetras(n: number): string {
  const uns = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const dec = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const esp: Record<number, string> = { 11:'once',12:'doce',13:'trece',14:'catorce',15:'quince',16:'dieciséis',17:'diecisiete',18:'dieciocho',19:'diecinueve',21:'veintiún',22:'veintidós',23:'veintitrés',24:'veinticuatro',25:'veinticinco',26:'veintiséis',27:'veintisiete',28:'veintiocho',29:'veintinueve' };
  const cen = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
  const conv = (n: number): string => {
    if (n===0) return 'cero'; if (n===100) return 'cien'; if (n<10) return uns[n];
    if (esp[n]) return esp[n];
    if (n<100) { const d=Math.floor(n/10),u=n%10; return u===0?dec[d]:`${dec[d]} y ${uns[u]}`; }
    if (n<1000) { const c=Math.floor(n/100),r=n%100; return r===0?cen[c]:`${cen[c]} ${conv(r)}`; }
    if (n<1000000) { const m=Math.floor(n/1000),r=n%1000; const ms=m===1?'mil':`${conv(m)} mil`; return r===0?ms:`${ms} ${conv(r)}`; }
    return n.toString();
  };
  const entero=Math.floor(n), cts=Math.round((n-entero)*100);
  const res=cts>0?`${conv(entero)} euros con ${conv(cts)} céntimos`:`${conv(entero)} euros`;
  return res.charAt(0).toUpperCase()+res.slice(1);
}

export function RecibiGenerator({ cliente, recibi, emisorNombre, emisorNif, emisorDireccion }: RecibiGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [logoB64, setLogoB64] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LOGO_STORAGE_KEY);
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target?.result as string;
      setLogoB64(b64);
      localStorage.setItem(LOGO_STORAGE_KEY, b64);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoB64(null);
    localStorage.removeItem(LOGO_STORAGE_KEY);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Recibí ${recibi.numero}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .doc { width: 210mm; min-height: 297mm; padding: 14mm 16mm; position: relative; }
        .stripe { position: absolute; top: 0; left: 0; width: 6mm; height: 100%; background: #111; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10mm; padding-left: 4mm; }
        .logo-block img { max-height: 18mm; max-width: 44mm; object-fit: contain; }
        .logo-placeholder { width: 44mm; height: 18mm; border: 1pt dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #aaa; }
        .title-block { text-align: right; }
        .title-block h1 { font-family: 'DM Serif Display', serif; font-size: 32pt; letter-spacing: -1pt; color: #111; line-height: 1; }
        .title-block .num { font-size: 9pt; color: #888; letter-spacing: 2pt; margin-top: 2pt; }
        .divider { height: 0.5pt; background: #ddd; margin: 0 0 8mm 4mm; }
        .parties { display: flex; gap: 8mm; margin-bottom: 8mm; padding-left: 4mm; }
        .party { flex: 1; }
        .party-label { font-size: 7pt; font-weight: 600; letter-spacing: 2pt; text-transform: uppercase; color: #888; margin-bottom: 3pt; }
        .party-name { font-size: 12pt; font-weight: 600; color: #111; }
        .party-sub { font-size: 9pt; color: #666; margin-top: 2pt; line-height: 1.5; }
        .amount-block { background: #111; color: #fff; margin: 0 0 8mm 4mm; padding: 6mm 8mm; display: flex; justify-content: space-between; align-items: center; }
        .amount-label { font-size: 8pt; letter-spacing: 2pt; text-transform: uppercase; color: #aaa; }
        .amount-value { font-family: 'DM Serif Display', serif; font-size: 28pt; letter-spacing: -1pt; }
        .amount-words { font-size: 8.5pt; color: #bbb; margin-top: 2pt; font-style: italic; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; margin-bottom: 8mm; padding-left: 4mm; }
        .detail-item { border-bottom: 0.5pt solid #eee; padding-bottom: 3pt; }
        .detail-label { font-size: 7pt; font-weight: 600; letter-spacing: 1.5pt; text-transform: uppercase; color: #aaa; margin-bottom: 2pt; }
        .detail-value { font-size: 10pt; color: #111; font-weight: 500; }
        .sigs { display: flex; justify-content: space-between; margin-top: 16mm; padding: 0 4mm; }
        .sig-box { width: 62mm; }
        .sig-line { border-top: 0.5pt solid #111; padding-top: 4pt; font-size: 8pt; color: #888; }
        .footer { position: absolute; bottom: 8mm; left: 22mm; right: 16mm; border-top: 0.5pt solid #eee; padding-top: 3pt; display: flex; justify-content: space-between; font-size: 7.5pt; color: #bbb; }
      </style></head><body>
      ${content.innerHTML}
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fechaLarga = new Date(recibi.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const nombreCompleto = [cliente.nombre, cliente.apellidos].filter(Boolean).join(' ');

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
        <button onClick={handlePrint} className="btn btn-primary btn-sm flex items-center gap-2">
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
        <div className="flex items-center gap-2">
          {logoB64 ? (
            <div className="flex items-center gap-2">
              <img src={logoB64} alt="logo" className="h-8 object-contain rounded border border-gray-200 px-1" />
              <button onClick={removeLogo} className="action-btn action-delete" title="Quitar logo"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-2">
              <Image className="w-4 h-4" /> Añadir logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          )}
          <span className="text-xs text-gray-400">El logo se guarda para todos los recibís</span>
        </div>
      </div>

      {/* ── Preview ── */}
      <div ref={printRef}>
        <div className="doc" style={{
          width: '210mm', minHeight: '297mm', padding: '14mm 16mm',
          fontFamily: "'DM Sans', 'Segoe UI', Arial, sans-serif",
          background: '#fff', position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          margin: '0 auto'
        }}>
          {/* Left accent stripe */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '6mm', height: '100%', background: '#111' }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10mm', paddingLeft: '4mm' }}>
            <div>
              {logoB64 ? (
                <img src={logoB64} alt="logo" style={{ maxHeight: '18mm', maxWidth: '44mm', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: '13pt', fontWeight: 700, color: '#111', letterSpacing: '-0.5pt' }}>
                  {emisorNombre || 'Mi Empresa'}
                </div>
              )}
              {emisorNif && <div style={{ fontSize: '8pt', color: '#888', marginTop: '3pt' }}>NIF: {emisorNif}</div>}
              {emisorDireccion && <div style={{ fontSize: '8pt', color: '#888' }}>{emisorDireccion}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '32pt', letterSpacing: '-1pt', color: '#111', lineHeight: 1 }}>RECIBÍ</div>
              <div style={{ fontSize: '8pt', color: '#999', letterSpacing: '2pt', marginTop: '3pt' }}>Nº {recibi.numero}</div>
              <div style={{ fontSize: '8pt', color: '#999', marginTop: '2pt' }}>{fechaLarga}</div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '0.5pt', background: '#e2e8f0', margin: '0 0 8mm 4mm' }} />

          {/* Parties */}
          <div style={{ display: 'flex', gap: '8mm', marginBottom: '8mm', paddingLeft: '4mm' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '2pt', textTransform: 'uppercase' as const, color: '#999', marginBottom: '4pt' }}>EMISOR</div>
              <div style={{ fontSize: '12pt', fontWeight: 700, color: '#111' }}>{emisorNombre || '—'}</div>
              {emisorNif && <div style={{ fontSize: '9pt', color: '#666', marginTop: '2pt' }}>NIF: {emisorNif}</div>}
              {emisorDireccion && <div style={{ fontSize: '9pt', color: '#666' }}>{emisorDireccion}</div>}
            </div>
            <div style={{ width: '0.5pt', background: '#e2e8f0' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '2pt', textTransform: 'uppercase' as const, color: '#999', marginBottom: '4pt' }}>PAGADOR</div>
              <div style={{ fontSize: '12pt', fontWeight: 700, color: '#111' }}>{nombreCompleto}</div>
              {cliente.nif && <div style={{ fontSize: '9pt', color: '#666', marginTop: '2pt' }}>Doc: {cliente.nif}</div>}
              {cliente.telefono && <div style={{ fontSize: '9pt', color: '#666' }}>Tel: {cliente.telefono}</div>}
            </div>
          </div>

          {/* Amount block */}
          <div style={{ background: '#111', color: '#fff', margin: '0 0 8mm 4mm', padding: '6mm 8mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '8pt', letterSpacing: '2pt', textTransform: 'uppercase' as const, color: '#888', marginBottom: '4pt' }}>IMPORTE RECIBIDO</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '30pt', letterSpacing: '-1pt', color: '#fff' }}>{fmt(recibi.importe)} €</div>
              <div style={{ fontSize: '8.5pt', color: '#aaa', marginTop: '4pt', fontStyle: 'italic' }}>
                {importeEnLetras(recibi.importe)}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '8pt', color: '#666', lineHeight: 1.8 }}>
              <div style={{ color: '#888', letterSpacing: '1pt', textTransform: 'uppercase' as const, marginBottom: '4pt' }}>Forma de pago</div>
              <div style={{ fontSize: '12pt', color: '#fff', fontWeight: 600 }}>{recibi.forma_pago}</div>
            </div>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm 8mm', marginBottom: '8mm', paddingLeft: '4mm' }}>
            <div style={{ borderBottom: '0.5pt solid #eee', paddingBottom: '4pt' }}>
              <div style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '1.5pt', textTransform: 'uppercase' as const, color: '#bbb', marginBottom: '3pt' }}>CONCEPTO</div>
              <div style={{ fontSize: '10pt', color: '#111', fontWeight: 500 }}>{recibi.concepto}</div>
            </div>
            <div style={{ borderBottom: '0.5pt solid #eee', paddingBottom: '4pt' }}>
              <div style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '1.5pt', textTransform: 'uppercase' as const, color: '#bbb', marginBottom: '3pt' }}>FECHA</div>
              <div style={{ fontSize: '10pt', color: '#111', fontWeight: 500 }}>{fechaLarga}</div>
            </div>
            {(recibi as any).procedimiento_titulo && (
              <div style={{ borderBottom: '0.5pt solid #eee', paddingBottom: '4pt', gridColumn: '1/-1' }}>
                <div style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '1.5pt', textTransform: 'uppercase' as const, color: '#bbb', marginBottom: '3pt' }}>EXPEDIENTE</div>
                <div style={{ fontSize: '10pt', color: '#111', fontWeight: 500 }}>{(recibi as any).procedimiento_titulo}</div>
              </div>
            )}
            {(recibi as any).notas && (
              <div style={{ borderBottom: '0.5pt solid #eee', paddingBottom: '4pt', gridColumn: '1/-1' }}>
                <div style={{ fontSize: '7pt', fontWeight: 700, letterSpacing: '1.5pt', textTransform: 'uppercase' as const, color: '#bbb', marginBottom: '3pt' }}>NOTAS</div>
                <div style={{ fontSize: '9pt', color: '#555' }}>{(recibi as any).notas}</div>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18mm', padding: '0 4mm' }}>
            <div style={{ width: '62mm' }}>
              <div style={{ height: '16mm' }} />
              <div style={{ borderTop: '0.5pt solid #111', paddingTop: '4pt', fontSize: '8pt', color: '#888' }}>
                Firma del pagador<br />
                <span style={{ fontSize: '7.5pt', color: '#bbb' }}>{nombreCompleto}</span>
              </div>
            </div>
            <div style={{ width: '62mm' }}>
              <div style={{ height: '16mm' }} />
              <div style={{ borderTop: '0.5pt solid #111', paddingTop: '4pt', fontSize: '8pt', color: '#888' }}>
                Firma y sello del emisor<br />
                <span style={{ fontSize: '7.5pt', color: '#bbb' }}>{emisorNombre || ''}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: 'absolute', bottom: '8mm', left: '22mm', right: '16mm', borderTop: '0.5pt solid #eee', paddingTop: '3pt', display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt', color: '#ccc' }}>
            <span>Documento de recibí — Nº {recibi.numero}</span>
            <span>Generado el {new Date().toLocaleDateString('es-ES')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
