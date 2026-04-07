'use client';

import React, { useState, useRef } from 'react';
import type { Cliente } from '@/lib/supabase/types';
import { Printer, Save, Upload, FileCheck } from 'lucide-react';

const STORAGE_KEY = 'designacion_representante_perfil';

interface RepresentanteProfile {
  dni_nie: string;
  razon_social: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  domicilio: string;
  localidad: string;
  cp: string;
  provincia: string;
  telefono: string;
  email: string;
}

interface DesignacionFormData {
  // Representado (cliente)
  nombre: string;
  apellido1: string;
  apellido2: string;
  nacionalidad: string;
  nif: string;
  pasaporte: string;
  fecha_nac_dia: string;
  fecha_nac_mes: string;
  fecha_nac_anio: string;
  localidad_nacimiento: string;
  pais: string;
  nombre_padre: string;
  nombre_madre: string;
  estado_civil: string; // S C V D Sp
  domicilio: string;
  numero: string;
  piso: string;
  localidad: string;
  cp: string;
  provincia: string;
  telefono: string;
  email: string;
  // Representante
  rep_dni_nie: string;
  rep_razon_social: string;
  rep_nombre: string;
  rep_apellido1: string;
  rep_apellido2: string;
  rep_domicilio: string;
  rep_numero: string;
  rep_piso: string;
  rep_localidad: string;
  rep_cp: string;
  rep_provincia: string;
  rep_telefono: string;
  rep_email: string;
  // Consentimiento
  consentimiento_dehu: boolean;
  // Lugar y fecha
  lugar: string;
  fecha_dia: string;
  fecha_mes: string;
  fecha_anio: string;
  // Procedimiento (campo libre en el texto legal)
  procedimiento_texto: string;
}

interface DesignacionRepresentanteProps {
  cliente?: Cliente;
  onClose?: () => void;
}

function loadRepresentantePerfil(): RepresentanteProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const fLabel = (text: string) => (
  <span key={text} style={{ fontSize: '8pt', whiteSpace: 'nowrap' as const }}>{text}</span>
);

const fBox = (value: string, flex: number) => (
  <span key={value + flex} style={{ borderBottom: '1pt solid #000', flex, minWidth: 0, height: '12pt', fontSize: '9pt', padding: '0 2pt', display: 'inline-block' }}>{value}</span>
);

const fRow = (children: React.ReactNode[]) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6pt', marginBottom: '5pt' }}>
    {children}
  </div>
);

export function DesignacionRepresentante({ cliente, onClose }: DesignacionRepresentanteProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const savedPerfil = loadRepresentantePerfil();

  const [form, setForm] = useState<DesignacionFormData>({
    nombre: cliente?.nombre || '',
    apellido1: cliente?.apellidos?.split(' ')[0] || '',
    apellido2: cliente?.apellidos?.split(' ').slice(1).join(' ') || '',
    nacionalidad: cliente?.nacionalidad || '',
    nif: cliente?.nif || '',
    pasaporte: '',
    fecha_nac_dia: '',
    fecha_nac_mes: '',
    fecha_nac_anio: cliente?.anio_nacimiento?.toString() || '',
    localidad_nacimiento: '',
    pais: cliente?.nacionalidad || '',
    nombre_padre: '',
    nombre_madre: '',
    estado_civil: '',
    domicilio: cliente?.direccion || '',
    numero: '',
    piso: '',
    localidad: cliente?.localidad || '',
    cp: cliente?.codigo_postal || '',
    provincia: cliente?.provincia || '',
    telefono: cliente?.telefono || '',
    email: cliente?.email || '',
    rep_dni_nie: savedPerfil?.dni_nie || '',
    rep_razon_social: savedPerfil?.razon_social || '',
    rep_nombre: savedPerfil?.nombre || '',
    rep_apellido1: savedPerfil?.apellido1 || '',
    rep_apellido2: savedPerfil?.apellido2 || '',
    rep_domicilio: savedPerfil?.domicilio || '',
    rep_numero: '',
    rep_piso: '',
    rep_localidad: savedPerfil?.localidad || '',
    rep_cp: savedPerfil?.cp || '',
    rep_provincia: savedPerfil?.provincia || '',
    rep_telefono: savedPerfil?.telefono || '',
    rep_email: savedPerfil?.email || '',
    consentimiento_dehu: false,
    lugar: '',
    fecha_dia: today.getDate().toString(),
    fecha_mes: (today.getMonth() + 1).toString(),
    fecha_anio: today.getFullYear().toString(),
    procedimiento_texto: '',
  });

  const [showPreview, setShowPreview] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const set = (key: keyof DesignacionFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const saveRepresentantePerfil = () => {
    const perfil: RepresentanteProfile = {
      dni_nie: form.rep_dni_nie,
      razon_social: form.rep_razon_social,
      nombre: form.rep_nombre,
      apellido1: form.rep_apellido1,
      apellido2: form.rep_apellido2,
      domicilio: form.rep_domicilio,
      localidad: form.rep_localidad,
      cp: form.rep_cp,
      provincia: form.rep_provincia,
      telefono: form.rep_telefono,
      email: form.rep_email,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfil));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Designación de Representante</title>
      <style>
        @page { size: A4; margin: 15mm 18mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; margin: 0; padding: 0; line-height: 1.3; }
        .header { display: flex; align-items: flex-start; gap: 12pt; margin-bottom: 14pt; }
        .header img { width: 36pt; }
        .header-ministry { font-size: 7.5pt; font-weight: bold; line-height: 1.4; }
        .title { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 3pt; }
        .subtitle { text-align: center; font-size: 9pt; margin-bottom: 14pt; }
        .field-row { display: flex; align-items: flex-end; gap: 6pt; margin-bottom: 5pt; }
        .field-label { font-size: 8pt; white-space: nowrap; }
        .field-box { border-bottom: 1pt solid #000; flex: 1; min-width: 0; height: 12pt; font-size: 9pt; padding: 0 2pt; }
        .field-box-sm { border-bottom: 1pt solid #000; width: 30pt; height: 12pt; font-size: 9pt; padding: 0 2pt; }
        .field-box-md { border-bottom: 1pt solid #000; width: 50pt; height: 12pt; font-size: 9pt; padding: 0 2pt; }
        .field-box-date { border: 1pt solid #000; width: 14pt; height: 12pt; text-align: center; font-size: 9pt; display: inline-block; }
        .section-divider { border-top: 0.5pt solid #ccc; margin: 8pt 0; }
        .legal-text { font-size: 8.5pt; text-align: justify; line-height: 1.5; margin: 8pt 0; }
        .designa { font-weight: bold; }
        .checkbox-row { display: flex; align-items: flex-start; gap: 5pt; margin-top: 10pt; font-size: 8pt; }
        .checkbox-sq { border: 1pt solid #000; width: 10pt; height: 10pt; display: inline-block; flex-shrink: 0; margin-top: 1pt; }
        .firma-area { margin-top: 20pt; }
        .fecha-row { display: flex; align-items: flex-end; justify-content: center; gap: 4pt; font-size: 9pt; margin-bottom: 8pt; }
        .firma-box { border: 1pt solid #000; width: 180pt; height: 80pt; margin: 0 auto; }
        .firma-label { text-align: center; font-size: 9pt; font-weight: bold; margin-bottom: 4pt; }
        .ec-row { display: flex; gap: 6pt; align-items: center; }
        .ec-box { border: 1pt solid #000; width: 12pt; height: 12pt; display: inline-flex; align-items: center; justify-content: center; font-size: 7pt; }
      </style>
      </head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const nombreCompleto = [form.nombre, form.apellido1, form.apellido2].filter(Boolean).join(' ');
  const repNombreCompleto = [form.rep_nombre, form.rep_apellido1, form.rep_apellido2].filter(Boolean).join(' ');
  const mesNombre = MESES[(parseInt(form.fecha_mes) || 1) - 1] || '';

  return (
    <div style={{ maxHeight: '82vh', overflowY: 'auto' }}>
      {!showPreview ? (
        <div className="form-grid">
          {/* ── REPRESENTADO ── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Datos del interesado (Representado) — se cargan del cliente</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="form-label">Nombre</label>
                <input className="form-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div>
                <label className="form-label">1er Apellido</label>
                <input className="form-input" value={form.apellido1} onChange={e => set('apellido1', e.target.value)} />
              </div>
              <div>
                <label className="form-label">2º Apellido</label>
                <input className="form-input" value={form.apellido2} onChange={e => set('apellido2', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Nacionalidad</label>
                <input className="form-input" value={form.nacionalidad} onChange={e => set('nacionalidad', e.target.value)} />
              </div>
              <div>
                <label className="form-label">NIF</label>
                <input className="form-input" value={form.nif} onChange={e => set('nif', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Pasaporte Nº</label>
                <input className="form-input" value={form.pasaporte} onChange={e => set('pasaporte', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="form-label">Día nac.</label><input className="form-input" value={form.fecha_nac_dia} onChange={e => set('fecha_nac_dia', e.target.value)} placeholder="dd" /></div>
                <div><label className="form-label">Mes</label><input className="form-input" value={form.fecha_nac_mes} onChange={e => set('fecha_nac_mes', e.target.value)} placeholder="mm" /></div>
                <div><label className="form-label">Año</label><input className="form-input" value={form.fecha_nac_anio} onChange={e => set('fecha_nac_anio', e.target.value)} placeholder="aaaa" /></div>
              </div>
              <div>
                <label className="form-label">Localidad nacimiento</label>
                <input className="form-input" value={form.localidad_nacimiento} onChange={e => set('localidad_nacimiento', e.target.value)} />
              </div>
              <div>
                <label className="form-label">País</label>
                <input className="form-input" value={form.pais} onChange={e => set('pais', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Nombre del padre</label>
                <input className="form-input" value={form.nombre_padre} onChange={e => set('nombre_padre', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Nombre de la madre</label>
                <input className="form-input" value={form.nombre_madre} onChange={e => set('nombre_madre', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Estado civil</label>
                <select className="form-input" value={form.estado_civil} onChange={e => set('estado_civil', e.target.value)}>
                  <option value="">—</option>
                  <option value="S">S (Soltero/a)</option>
                  <option value="C">C (Casado/a)</option>
                  <option value="V">V (Viudo/a)</option>
                  <option value="D">D (Divorciado/a)</option>
                  <option value="Sp">Sp (Separado/a)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Domicilio en España</label>
                <input className="form-input" value={form.domicilio} onChange={e => set('domicilio', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="form-label">Nº</label><input className="form-input" value={form.numero} onChange={e => set('numero', e.target.value)} /></div>
                <div><label className="form-label">Piso</label><input className="form-input" value={form.piso} onChange={e => set('piso', e.target.value)} /></div>
              </div>
              <div>
                <label className="form-label">Localidad</label>
                <input className="form-input" value={form.localidad} onChange={e => set('localidad', e.target.value)} />
              </div>
              <div>
                <label className="form-label">C.P.</label>
                <input className="form-input" value={form.cp} onChange={e => set('cp', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Provincia</label>
                <input className="form-input" value={form.provincia} onChange={e => set('provincia', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
              </div>
              <div>
                <label className="form-label">E-mail</label>
                <input className="form-input" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* ── REPRESENTANTE ── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Datos del representante (Apoderado)</legend>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">Estos datos se guardan para no tener que rellenarlos cada vez</span>
              <button type="button" onClick={saveRepresentantePerfil} className="btn btn-secondary btn-sm flex items-center gap-1">
                <Save className="w-3 h-3" /> {savedMsg ? '¡Guardado!' : 'Guardar perfil'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="form-label">DNI/NIE/NIE</label>
                <input className="form-input" value={form.rep_dni_nie} onChange={e => set('rep_dni_nie', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Razón Social (si empresa)</label>
                <input className="form-input" value={form.rep_razon_social} onChange={e => set('rep_razon_social', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Nombre</label>
                <input className="form-input" value={form.rep_nombre} onChange={e => set('rep_nombre', e.target.value)} />
              </div>
              <div>
                <label className="form-label">1er Apellido</label>
                <input className="form-input" value={form.rep_apellido1} onChange={e => set('rep_apellido1', e.target.value)} />
              </div>
              <div>
                <label className="form-label">2º Apellido</label>
                <input className="form-input" value={form.rep_apellido2} onChange={e => set('rep_apellido2', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Domicilio en España</label>
                <input className="form-input" value={form.rep_domicilio} onChange={e => set('rep_domicilio', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="form-label">Nº</label><input className="form-input" value={form.rep_numero} onChange={e => set('rep_numero', e.target.value)} /></div>
                <div><label className="form-label">Piso</label><input className="form-input" value={form.rep_piso} onChange={e => set('rep_piso', e.target.value)} /></div>
              </div>
              <div>
                <label className="form-label">Localidad</label>
                <input className="form-input" value={form.rep_localidad} onChange={e => set('rep_localidad', e.target.value)} />
              </div>
              <div>
                <label className="form-label">C.P.</label>
                <input className="form-input" value={form.rep_cp} onChange={e => set('rep_cp', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Provincia</label>
                <input className="form-input" value={form.rep_provincia} onChange={e => set('rep_provincia', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={form.rep_telefono} onChange={e => set('rep_telefono', e.target.value)} />
              </div>
              <div>
                <label className="form-label">E-mail</label>
                <input className="form-input" value={form.rep_email} onChange={e => set('rep_email', e.target.value)} />
              </div>
            </div>
          </fieldset>

          {/* ── PROCEDIMIENTO ── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Solicitud (texto que aparece en el documento)</legend>
            <div>
              <label className="form-label">Tipo de solicitud / procedimiento</label>
              <input className="form-input" value={form.procedimiento_texto} onChange={e => set('procedimiento_texto', e.target.value)} placeholder="solicitud de autorización de residencia temporal por arraigo social" />
            </div>
          </fieldset>

          {/* ── CONSENTIMIENTO Y FECHA ── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Consentimiento y fecha</legend>
            <label className="flex items-start gap-2 cursor-pointer mb-4">
              <input type="checkbox" className="form-checkbox mt-1" checked={form.consentimiento_dehu} onChange={e => set('consentimiento_dehu', e.target.checked)} />
              <span className="text-sm text-gray-700">CONSIENTO que las comunicaciones y notificaciones se realicen mediante puesta a disposición en la Dirección electrónica habilitada Única (Dehú), para lo cual será obligatorio disponer de certificado electrónico válido o sistema cl@ve.</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="form-label">Lugar</label>
                <input className="form-input" value={form.lugar} onChange={e => set('lugar', e.target.value)} placeholder="Madrid" />
              </div>
              <div>
                <label className="form-label">Día</label>
                <input className="form-input" value={form.fecha_dia} onChange={e => set('fecha_dia', e.target.value)} placeholder="dd" />
              </div>
              <div>
                <label className="form-label">Mes</label>
                <select className="form-input" value={form.fecha_mes} onChange={e => set('fecha_mes', e.target.value)}>
                  {MESES.map((m, i) => <option key={i} value={(i+1).toString()}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Año</label>
                <input className="form-input" value={form.fecha_anio} onChange={e => set('fecha_anio', e.target.value)} placeholder="aaaa" />
              </div>
            </div>
          </fieldset>

          {/* ── DOCUMENTO FIRMADO ── */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Documento firmado (subir una vez firmado)</legend>
            <div className="flex items-center gap-3">
              <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploadedFile ? uploadedFile.name : 'Seleccionar archivo PDF/imagen'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setUploadedFile(e.target.files?.[0] || null)} />
              </label>
              {uploadedFile && <span className="text-green-600 flex items-center gap-1 text-sm"><FileCheck className="w-4 h-4" /> Archivo seleccionado</span>}
            </div>
            <p className="text-xs text-gray-400 mt-1">Sube aquí el documento después de que ambas partes lo hayan firmado.</p>
          </fieldset>

          <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-white py-3 border-t border-gray-200">
            {onClose && <button type="button" onClick={onClose} className="btn btn-secondary">Cerrar</button>}
            <button type="button" onClick={() => setShowPreview(true)} className="btn btn-primary">Vista previa y generar documento</button>
          </div>
        </div>
      ) : (
        /* ═══ VISTA PREVIA — replica del formulario oficial ═══ */
        <div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowPreview(false)} className="btn btn-secondary btn-sm">← Editar datos</button>
            <button onClick={handlePrint} className="btn btn-primary btn-sm flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir / Descargar PDF
            </button>
          </div>

          {/* Documento preview */}
          <div ref={printRef}>
            <div style={{ maxWidth: '210mm', margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#000', padding: '10mm', background: '#fff', lineHeight: 1.3 }}>

              {/* Cabecera ministerio */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12pt', marginBottom: '12pt' }}>
                <div style={{ fontSize: '7.5pt', fontWeight: 'bold', lineHeight: 1.5 }}>
                  MINISTERIO<br />DE INCLUSIÓN,<br />SEGURIDAD SOCIAL<br />Y MIGRACIONES
                </div>
              </div>

              {/* Título */}
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', marginBottom: '2pt' }}>DOCUMENTO DE DESIGNACIÓN DE REPRESENTANTE</div>
              <div style={{ textAlign: 'center', fontSize: '9pt', marginBottom: '16pt' }}>(RD 240/2007 y RD 1155/2024)</div>

              {/* Fila 1: Nombre, Apellidos */}
              {fRow([fLabel('Nombre'), fBox(form.nombre, 1), fLabel('1er Apellido'), fBox(form.apellido1, 1.5), fLabel('2º Apellido'), fBox(form.apellido2, 1.5)])}
              {/* Fila 2: Nacionalidad, NIF, Pasaporte */}
              {fRow([fLabel('Nacionalidad'), fBox(form.nacionalidad, 1.5), fLabel('NIF'), fBox(form.nif, 1), fLabel('Pasaporte Nº'), fBox(form.pasaporte, 1)])}
              {/* Fila 3: Fecha nac, Localidad, País */}
              {fRow([
                fLabel('Fecha de nacimiento'),
                <span key="dob" style={{ display: 'inline-flex', alignItems: 'center', gap: '2pt' }}>
                  <span style={{ border: '1pt solid #000', width: '20pt', height: '12pt', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt' }}>{form.fecha_nac_dia}</span>
                  <span>/</span>
                  <span style={{ border: '1pt solid #000', width: '20pt', height: '12pt', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt' }}>{form.fecha_nac_mes}</span>
                  <span>/</span>
                  <span style={{ border: '1pt solid #000', width: '32pt', height: '12pt', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt' }}>{form.fecha_nac_anio}</span>
                </span>,
                fLabel('Localidad'), fBox(form.localidad_nacimiento, 1.5), fLabel('País'), fBox(form.pais, 1)
              ])}
              {/* Fila 4: Padre, Madre, Estado civil */}
              {fRow([
                fLabel('Nombre del padre'), fBox(form.nombre_padre, 1.5),
                fLabel('Nombre de la madre'), fBox(form.nombre_madre, 1.5),
                fLabel('Estado civil'),
                <span key="ec" style={{ display: 'inline-flex', gap: '3pt', alignItems: 'center' }}>
                  {(['S','C','V','D','Sp'] as const).map(v => (
                    <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '1pt', fontSize: '7.5pt' }}>
                      <span style={{ border: '1pt solid #000', width: '10pt', height: '10pt', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: form.estado_civil === v ? '#000' : '#fff', color: form.estado_civil === v ? '#fff' : '#000', fontSize: '6pt' }}>✓</span>{v}
                    </span>
                  ))}
                </span>
              ])}
              {/* Fila 5: Domicilio */}
              {fRow([fLabel('Domicilio en España'), fBox(form.domicilio, 3), fLabel('Nº'), fBox(form.numero, 0.5), fLabel('Piso'), fBox(form.piso, 0.5)])}
              {/* Fila 6: Localidad, CP, Provincia */}
              {fRow([fLabel('Localidad'), fBox(form.localidad, 2), fLabel('C.P.'), fBox(form.cp, 0.7), fLabel('Provincia'), fBox(form.provincia, 1.5)])}
              {/* Fila 7: Teléfono, Email */}
              {fRow([fLabel('Teléfono'), fBox(form.telefono, 1.5), fLabel('E-mail'), fBox(form.email, 2)])}

              {/* Texto legal */}
              <div style={{ fontSize: '8.5pt', textAlign: 'justify', lineHeight: 1.5, margin: '12pt 0', borderTop: '0.5pt solid #ccc', paddingTop: '10pt' }}>
                <p>
                  A los efectos de los artículos 5 y 66 de la Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas, y de acuerdo con lo establecido en el artículo 197 del RD 1155/2024, de 19 de noviembre, y en el artículo 11 del Real Decreto 240/2007, de 16 de febrero, <strong>DESIGNO</strong> a la persona o razón social cuyos datos constan a continuación como representante para que formule en mi nombre solicitud de{' '}
                  <span style={{ borderBottom: '1pt solid #000', display: 'inline-block', minWidth: '120pt' }}>{form.procedimiento_texto}</span>{' '}
                  y le autorizo a presentar y firmar cuantos documentos sean reglamentariamente exigibles así como a intervenir en cuantos trámites y diligencias requiera el procedimiento, salvo aquéllas en que sea necesaria mi comparecencia personal.
                </p>
              </div>

              {/* Sección representante */}
              <div style={{ borderTop: '0.5pt solid #ccc', paddingTop: '8pt' }}>
                {fRow([fLabel('DNI/NIE/NIE'), fBox(form.rep_dni_nie, 1.2), fLabel('Razón Social'), fBox(form.rep_razon_social, 2)])}
                {fRow([fLabel('Nombre'), fBox(form.rep_nombre, 1), fLabel('1er Apellido'), fBox(form.rep_apellido1, 1.5), fLabel('2º Apellido'), fBox(form.rep_apellido2, 1.5)])}
                {fRow([fLabel('Domicilio en España'), fBox(form.rep_domicilio, 3), fLabel('Nº'), fBox(form.rep_numero, 0.5), fLabel('Piso'), fBox(form.rep_piso, 0.5)])}
                {fRow([fLabel('Localidad'), fBox(form.rep_localidad, 2), fLabel('C.P.'), fBox(form.rep_cp, 0.7), fLabel('Provincia'), fBox(form.rep_provincia, 1.5)])}
                {fRow([fLabel('Teléfono'), fBox(form.rep_telefono, 1.5), fLabel('E-mail'), fBox(form.rep_email, 2)])}
              </div>

              {/* Consentimiento DEHú */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5pt', marginTop: '12pt', fontSize: '8pt' }}>
                <span style={{ border: '1pt solid #000', width: '10pt', height: '10pt', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '1pt', background: form.consentimiento_dehu ? '#000' : '#fff', color: '#fff', fontSize: '6pt' }}>{form.consentimiento_dehu ? '✓' : ''}</span>
                <span>CONSIENTO que las comunicaciones y notificaciones se realicen mediante puesta a disposición en la Dirección electrónica habilitada Única (Dehú), para lo cual será obligatorio disponer de certificado electrónico válido o sistema cl@ve.</span>
              </div>

              {/* Fecha y firma */}
              <div style={{ marginTop: '24pt', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4pt', fontSize: '9pt', marginBottom: '10pt' }}>
                  <span>En</span>
                  <span style={{ borderBottom: '1pt solid #000', minWidth: '60pt', display: 'inline-block', textAlign: 'center' }}>{form.lugar}</span>
                  <span>, a</span>
                  <span style={{ border: '1pt solid #000', width: '18pt', height: '14pt', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{form.fecha_dia}</span>
                  <span>de</span>
                  <span style={{ borderBottom: '1pt solid #000', minWidth: '50pt', display: 'inline-block', textAlign: 'center' }}>{mesNombre}</span>
                  <span>de</span>
                  <span style={{ borderBottom: '1pt solid #000', minWidth: '30pt', display: 'inline-block', textAlign: 'center' }}>{form.fecha_anio}</span>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '9pt', marginBottom: '6pt' }}>FIRMA</div>
                <div style={{ border: '1pt solid #000', width: '180pt', height: '80pt', margin: '0 auto' }}></div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
