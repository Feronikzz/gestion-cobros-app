'use client';

import { useState, useRef } from 'react';
import type { Cliente, Recibi } from '@/lib/supabase/types';
import { Printer, ImageIcon, X, User, Save, ChevronDown, ChevronUp } from 'lucide-react';

const LOGO_KEY = 'recibi_logo_b64';
const EMISOR_KEY = 'recibi_emisor_perfil';

interface EmisorPerfil {
  nombre: string;
  nif: string;
  direccion: string;
  telefono: string;
  email: string;
}

function loadEmisor(): EmisorPerfil {
  if (typeof window === 'undefined') return { nombre: '', nif: '', direccion: '', telefono: '', email: '' };
  try {
    const r = localStorage.getItem(EMISOR_KEY);
    return r ? JSON.parse(r) : { nombre: '', nif: '', direccion: '', telefono: '', email: '' };
  } catch { return { nombre: '', nif: '', direccion: '', telefono: '', email: '' }; }
}

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

export function RecibiGenerator({ cliente, recibi }: RecibiGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const [logoB64, setLogoB64] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LOGO_KEY);
  });

  const [emisor, setEmisor] = useState<EmisorPerfil>(loadEmisor);
  const [showEmisorForm, setShowEmisorForm] = useState(false);
  const [emisorSaved, setEmisorSaved] = useState(false);

  const saveEmisor = () => {
    localStorage.setItem(EMISOR_KEY, JSON.stringify(emisor));
    setEmisorSaved(true);
    setTimeout(() => setEmisorSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target?.result as string;
      setLogoB64(b64);
      localStorage.setItem(LOGO_KEY, b64);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoB64(null);
    localStorage.removeItem(LOGO_KEY);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Recibí ${recibi.numero}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');
        @page { size: 210mm 99mm; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .talonario { width: 210mm; height: 99mm; padding: 8mm 8mm 6mm 8mm; position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .stripe { position: absolute; top: 0; left: 0; width: 100%; height: 3mm; background: #111; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3mm; }
        .logo img { max-height: 8mm; max-width: 32mm; object-fit: contain; }
        .logo-name { font-size: 9pt; font-weight: 700; color: #111; }
        .logo-sub { font-size: 6pt; color: #888; margin-top: 1pt; }
        .title-r { text-align: right; }
        .title-r h1 { font-family: 'DM Serif Display', Georgia, serif; font-size: 18pt; color: #111; line-height: 1; }
        .title-r .num { font-size: 6pt; color: #999; letter-spacing: 1.5pt; margin-top: 2pt; }
        .divider { height: 0.4pt; background: #ddd; margin-bottom: 3mm; }
        .body-row { display: flex; gap: 6mm; flex: 1; }
        .amount-block { min-width: 52mm; border-right: 0.4pt solid #e8e8e8; padding-right: 6mm; }
        .amount-label { font-size: 5.5pt; letter-spacing: 1.5pt; text-transform: uppercase; color: #aaa; margin-bottom: 2pt; }
        .amount-value { font-family: 'DM Serif Display', Georgia, serif; font-size: 18pt; letter-spacing: -0.5pt; color: #111; }
        .amount-words { font-size: 6pt; color: #888; margin-top: 2pt; font-style: italic; line-height: 1.3; }
        .middle { flex: 1; display: flex; flex-direction: column; gap: 2mm; border-right: 0.4pt solid #e8e8e8; padding-right: 6mm; }
        .party-label { font-size: 5pt; font-weight: 700; letter-spacing: 1.5pt; text-transform: uppercase; color: #aaa; margin-bottom: 1pt; }
        .party-name { font-size: 7.5pt; font-weight: 700; color: #111; }
        .party-sub { font-size: 5.5pt; color: #888; margin-top: 0.5pt; }
        .right { min-width: 46mm; display: flex; flex-direction: column; gap: 2mm; }
        .detail-label { font-size: 5pt; font-weight: 700; letter-spacing: 1pt; text-transform: uppercase; color: #aaa; margin-bottom: 1pt; }
        .detail-value { font-size: 7pt; color: #111; font-weight: 500; }
        .sigs { display: flex; justify-content: space-between; gap: 4mm; margin-top: auto; padding-top: 3mm; border-top: 0.4pt solid #e8e8e8; }
        .sig-line { font-size: 5.5pt; color: #aaa; line-height: 1.4; }
        .footer { font-size: 5pt; color: #ccc; text-align: right; margin-top: 1mm; }
      </style></head><body>
      ${content.innerHTML}
    </body></html>`);
    win.document.close();
    win.print();
  };

  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fechaLarga = new Date(recibi.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const nombreCompleto = [cliente.nombre, cliente.apellidos].filter(Boolean).join(' ');
  const nombreEmisor = emisor.nombre || '—';

  const inp = 'form-input text-sm';

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-100">
        <button onClick={handlePrint} className="btn btn-primary btn-sm flex items-center gap-2">
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>

        {/* Logo */}
        {logoB64 ? (
          <div className="flex items-center gap-1.5 border border-gray-200 rounded px-2 py-1">
            <img src={logoB64} alt="logo" className="h-6 object-contain" />
            <button onClick={removeLogo} className="text-gray-400 hover:text-red-500" title="Quitar logo">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" /> Logo
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </label>
        )}

        {/* Emisor toggle */}
        <button
          onClick={() => setShowEmisorForm(v => !v)}
          className="btn btn-secondary btn-sm flex items-center gap-1.5"
        >
          <User className="w-3.5 h-3.5" />
          Perfil emisor
          {showEmisorForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <span className="text-xs text-gray-400 ml-1">Talonario horizontal (210×99mm)</span>
      </div>

      {/* ── Emisor profile form ── */}
      {showEmisorForm && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Datos del emisor</span>
            <button onClick={saveEmisor} className="btn btn-secondary btn-sm flex items-center gap-1 text-xs">
              <Save className="w-3 h-3" /> {emisorSaved ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <label className="form-label text-xs">Nombre / Razón social</label>
              <input className={inp} value={emisor.nombre} onChange={e => setEmisor(p => ({ ...p, nombre: e.target.value }))} placeholder="Tu nombre o empresa" />
            </div>
            <div>
              <label className="form-label text-xs">NIF</label>
              <input className={inp} value={emisor.nif} onChange={e => setEmisor(p => ({ ...p, nif: e.target.value }))} placeholder="12345678Z" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label text-xs">Dirección</label>
              <input className={inp} value={emisor.direccion} onChange={e => setEmisor(p => ({ ...p, direccion: e.target.value }))} placeholder="Calle, nº, ciudad" />
            </div>
            <div>
              <label className="form-label text-xs">Teléfono</label>
              <input className={inp} value={emisor.telefono} onChange={e => setEmisor(p => ({ ...p, telefono: e.target.value }))} placeholder="600000000" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label text-xs">Email</label>
              <input className={inp} value={emisor.email} onChange={e => setEmisor(p => ({ ...p, email: e.target.value }))} placeholder="email@ejemplo.com" />
            </div>
          </div>
        </div>
      )}

      {/* ── Talonario preview ── */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div ref={printRef}>
          <div className="talonario" style={{
            width: '210mm', height: '99mm', padding: '8mm 8mm 6mm 8mm',
            fontFamily: "'DM Sans', 'Segoe UI', Arial, sans-serif",
            background: '#fff', position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          }}>
            {/* Top stripe */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3mm', background: '#111' }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3mm' }}>
              <div>
                {logoB64
                  ? <img src={logoB64} alt="logo" style={{ maxHeight: '8mm', maxWidth: '32mm', objectFit: 'contain' }} />
                  : <div style={{ fontSize: '9pt', fontWeight: 700, color: '#111' }}>{nombreEmisor}</div>
                }
                {emisor.nif && <div style={{ fontSize: '6pt', color: '#888', marginTop: '1pt' }}>NIF: {emisor.nif}</div>}
                {emisor.direccion && <div style={{ fontSize: '5.5pt', color: '#aaa' }}>{emisor.direccion}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '18pt', color: '#111', lineHeight: 1 }}>RECIBÍ</div>
                <div style={{ fontSize: '6pt', color: '#999', letterSpacing: '1.5pt', marginTop: '2pt' }}>Nº {recibi.numero}</div>
                <div style={{ fontSize: '5.5pt', color: '#bbb', marginTop: '1pt' }}>{fechaLarga}</div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '0.4pt', background: '#ddd', marginBottom: '3mm' }} />

            {/* Body: 3 columns */}
            <div style={{ display: 'flex', gap: '6mm', flex: 1 }}>

              {/* Col 1 — Importe */}
              <div style={{ minWidth: '52mm', borderRight: '0.4pt solid #e8e8e8', paddingRight: '6mm' }}>
                <div style={{ fontSize: '5.5pt', letterSpacing: '1.5pt', textTransform: 'uppercase' as const, color: '#aaa', marginBottom: '2pt' }}>IMPORTE RECIBIDO</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '18pt', letterSpacing: '-0.5pt', color: '#111' }}>{fmt(recibi.importe)} €</div>
                <div style={{ fontSize: '6pt', color: '#888', marginTop: '2pt', fontStyle: 'italic', lineHeight: 1.3 }}>
                  {importeEnLetras(recibi.importe)}
                </div>
                <div style={{ marginTop: '4pt' }}>
                  <div style={{ fontSize: '5pt', fontWeight: 700, letterSpacing: '1pt', textTransform: 'uppercase' as const, color: '#aaa', marginBottom: '1pt' }}>FORMA DE PAGO</div>
                  <div style={{ fontSize: '7pt', color: '#111', fontWeight: 600 }}>{recibi.forma_pago}</div>
                </div>
              </div>

              {/* Col 2 — Partes */}
              <div style={{ flex: 1, borderRight: '0.4pt solid #e8e8e8', paddingRight: '6mm', display: 'flex', flexDirection: 'column', gap: '3mm' }}>
                <div>
                  <div style={{ fontSize: '5pt', fontWeight: 700, letterSpacing: '1.5pt', textTransform: 'uppercase' as const, color: '#aaa', marginBottom: '1pt' }}>EMISOR</div>
                  <div style={{ fontSize: '7.5pt', fontWeight: 700, color: '#111' }}>{nombreEmisor}</div>
                  {emisor.nif && <div style={{ fontSize: '5.5pt', color: '#888' }}>NIF: {emisor.nif}</div>}
                  {emisor.telefono && <div style={{ fontSize: '5.5pt', color: '#888' }}>{emisor.telefono}</div>}
                </div>
                <div>
                  <div style={{ fontSize: '5pt', fontWeight: 700, letterSpacing: '1.5pt', textTransform: 'uppercase' as const, color: '#aaa', marginBottom: '1pt' }}>PAGADOR</div>
                  <div style={{ fontSize: '7.5pt', fontWeight: 700, color: '#111' }}>{nombreCompleto}</div>
                  {cliente.nif && <div style={{ fontSize: '5.5pt', color: '#888' }}>Doc: {cliente.nif}</div>}
                  {cliente.telefono && <div style={{ fontSize: '5.5pt', color: '#888' }}>{cliente.telefono}</div>}
                </div>
              </div>

              {/* Col 3 — Detalles */}
              <div style={{ minWidth: '46mm', display: 'flex', flexDirection: 'column', gap: '3mm' }}>
                <div>
                  <div style={{ fontSize: '5pt', fontWeight: 700, letterSpacing: '1pt', textTransform: 'uppercase' as const, color: '#aaa', marginBottom: '1pt' }}>CONCEPTO</div>
                  <div style={{ fontSize: '7pt', color: '#111', fontWeight: 500, lineHeight: 1.3 }}>{recibi.concepto}</div>
                </div>
                {(recibi as any).procedimiento_titulo && (
                  <div>
                    <div style={{ fontSize: '5pt', fontWeight: 700, letterSpacing: '1pt', textTransform: 'uppercase' as const, color: '#aaa', marginBottom: '1pt' }}>EXPEDIENTE</div>
                    <div style={{ fontSize: '7pt', color: '#111', fontWeight: 500, lineHeight: 1.3 }}>{(recibi as any).procedimiento_titulo}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Signatures + footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '3mm', borderTop: '0.4pt solid #e8e8e8' }}>
              <div style={{ display: 'flex', gap: '16mm' }}>
                <div>
                  <div style={{ height: '6mm' }} />
                  <div style={{ borderTop: '0.4pt solid #999', paddingTop: '2pt', fontSize: '5.5pt', color: '#aaa' }}>
                    Firma del pagador — <span style={{ fontSize: '5pt', color: '#bbb' }}>{nombreCompleto}</span>
                  </div>
                </div>
                <div>
                  <div style={{ height: '6mm' }} />
                  <div style={{ borderTop: '0.4pt solid #999', paddingTop: '2pt', fontSize: '5.5pt', color: '#aaa' }}>
                    Firma y sello del emisor — <span style={{ fontSize: '5pt', color: '#bbb' }}>{nombreEmisor}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '5pt', color: '#ccc', textAlign: 'right' }}>
                Recibí Nº {recibi.numero}<br />{new Date().toLocaleDateString('es-ES')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
