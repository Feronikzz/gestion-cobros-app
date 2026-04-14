'use client';

import React, { useState, useEffect } from 'react';
import type { Cliente } from '@/lib/supabase/types';
import { Download, Save, User, FileText, RefreshCw, Upload, CheckCircle, X, Plus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY_REP = 'designacion_representante_perfil';
const STORAGE_KEY_EMAILS = 'designacion_emails_sugeridos';
const STORAGE_KEY_PDF = 'designacion_ultimo_pdf_b64';
const STORAGE_KEY_PDF_NAME = 'designacion_ultimo_pdf_nombre';

const EMAILS_DEFAULT = [
  'extranjeria@sepe.es',
  'oficina.extranjeria@madrid.org',
  'notificaciones@administracion.gob.es',
];

function loadEmails(): string[] {
  if (typeof window === 'undefined') return EMAILS_DEFAULT;
  try {
    const r = localStorage.getItem(STORAGE_KEY_EMAILS);
    return r ? JSON.parse(r) : EMAILS_DEFAULT;
  } catch { return EMAILS_DEFAULT; }
}

function saveEmails(emails: string[]) {
  localStorage.setItem(STORAGE_KEY_EMAILS, JSON.stringify(emails));
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

interface RepresentanteProfile {
  dni_nie: string; razon_social: string; nombre: string; apellido1: string; apellido2: string;
  domicilio: string; numero: string; piso: string; localidad: string; cp: string; provincia: string;
  telefono: string; email: string;
}

interface DesignacionRepresentanteProps {
  cliente?: Cliente;
  clienteId?: string;
  procedimientoId?: string;
  onClose?: () => void;
  onUploaded?: () => void;
}

function loadRepPerfil(): RepresentanteProfile | null {
  if (typeof window === 'undefined') return null;
  try { const r = localStorage.getItem(STORAGE_KEY_REP); return r ? JSON.parse(r) : null; } catch { return null; }
}

export function DesignacionRepresentante({ cliente, clienteId, procedimientoId, onClose, onUploaded }: DesignacionRepresentanteProps) {
  const supabase = typeof window !== 'undefined' ? createClient() : null;
  const today = new Date();
  const saved = loadRepPerfil();

  // ── Representado ──
  const apellidos = cliente?.apellidos || '';
  const ap1 = apellidos.split(' ')[0] || '';
  const ap2 = apellidos.split(' ').slice(1).join(' ') || '';

  const [repdo, setRepdo] = useState({
    nombre: cliente?.nombre || '', apellido1: ap1, apellido2: ap2,
    nacionalidad: (cliente as any)?.nacionalidad || '', nif: cliente?.nif || '', pasaporte: '',
    fecha_nac_dd: '', fecha_nac_mm: '', fecha_nac_aaaa: (cliente as any)?.anio_nacimiento?.toString() || '',
    localidad_nacimiento: '', pais: (cliente as any)?.nacionalidad || '',
    nombre_padre: '', nombre_madre: '', estado_civil: '',
    domicilio: (cliente as any)?.direccion || '', numero: '', piso: '',
    localidad: (cliente as any)?.localidad || '', cp: (cliente as any)?.codigo_postal || '',
    provincia: (cliente as any)?.provincia || '', telefono: cliente?.telefono || '', email: cliente?.email || '',
  });

  // ── Representante ──
  const [repte, setRepte] = useState({
    dni_nie: saved?.dni_nie || '', razon_social: saved?.razon_social || '',
    nombre: saved?.nombre || '', apellido1: saved?.apellido1 || '', apellido2: saved?.apellido2 || '',
    domicilio: saved?.domicilio || '', numero: saved?.numero || '', piso: saved?.piso || '',
    localidad: saved?.localidad || '', cp: saved?.cp || '', provincia: saved?.provincia || '',
    telefono: saved?.telefono || '', email: saved?.email || '',
  });

  const [solicitud, setSolicitud] = useState('');
  const [lugar, setLugar] = useState('');
  const [dia, setDia] = useState(String(today.getDate()));
  const [mes, setMes] = useState(MESES[today.getMonth()]);
  const [anio, setAnio] = useState(String(today.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Email suggestions ──
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>(loadEmails);
  const [showEmailDD, setShowEmailDD] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const addEmailSuggestion = (email: string) => {
    if (!email || emailSuggestions.includes(email)) return;
    const updated = [...emailSuggestions, email];
    setEmailSuggestions(updated);
    saveEmails(updated);
    setNewEmail('');
  };

  const removeEmailSuggestion = (email: string) => {
    const updated = emailSuggestions.filter(e => e !== email);
    setEmailSuggestions(updated);
    saveEmails(updated);
  };

  // ── PDF generado guardado ──
  const [savedPdfB64, setSavedPdfB64] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY_PDF);
  });
  const [savedPdfName, setSavedPdfName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY_PDF_NAME) || 'designacion.pdf';
  });

  // ── Signed file upload ──
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [uploadedSignedUrl, setUploadedSignedUrl] = useState<string | null>(null);

  const setR = (k: string, v: string) => setRepdo(p => ({ ...p, [k]: v }));
  const setT = (k: string, v: string) => setRepte(p => ({ ...p, [k]: v }));

  // Auto-guardar perfil representante en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REP, JSON.stringify(repte));
  }, [repte]);

  const saveRepPerfil = () => {
    localStorage.setItem(STORAGE_KEY_REP, JSON.stringify(repte));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  // Subir documento firmado a Supabase
  const handleUploadSigned = async () => {
    if (!signedFile || !supabase) return;
    if (!clienteId && !cliente?.id) {
      alert('No se puede subir: falta ID del cliente');
      return;
    }
    
    setUploadingSigned(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      
      const finalClienteId = clienteId || cliente?.id;
      
      // 1. Subir archivo a Storage
      const fileExt = signedFile.name.split('.').pop();
      const filePath = `${user.id}/designaciones/${Date.now()}_${signedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, signedFile);
      
      if (uploadError) throw uploadError;
      
      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);
      
      // 3. Crear registro en documentos
      await supabase.from('documentos').insert({
        user_id: user.id,
        cliente_id: finalClienteId,
        procedimiento_id: procedimientoId || null,
        nombre: `Designación firmada - ${repdo.apellido1 || 'cliente'}`,
        tipo: 'DESIGNACION_FIRMADA',
        archivo_url: publicUrl,
        fecha_subida: new Date().toISOString(),
      });
      
      setUploadedSignedUrl(publicUrl);
      onUploaded?.();
      alert('Documento firmado subido correctamente');
    } catch (error: any) {
      console.error('Error subiendo designación firmada:', error);
      alert('Error al subir: ' + error.message);
    } finally {
      setUploadingSigned(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fill-designacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          representado: repdo,
          representante: repte,
          solicitud,
          fecha_lugar: { lugar, dia, mes, anio },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al generar el PDF');
      }
      const blob = await res.blob();
      const fileName = `designacion-${repdo.apellido1 || 'representante'}.pdf`;

      // Guardar en localStorage como base64
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        localStorage.setItem(STORAGE_KEY_PDF, b64);
        localStorage.setItem(STORAGE_KEY_PDF_NAME, fileName);
        setSavedPdfB64(b64);
        setSavedPdfName(fileName);
      };
      reader.readAsDataURL(blob);

      // Descargar inmediatamente
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadSavedPdf = () => {
    if (!savedPdfB64) return;
    const a = document.createElement('a');
    a.href = savedPdfB64;
    a.download = savedPdfName;
    a.click();
  };

  const clearSavedPdf = () => {
    localStorage.removeItem(STORAGE_KEY_PDF);
    localStorage.removeItem(STORAGE_KEY_PDF_NAME);
    setSavedPdfB64(null);
    setSavedPdfName('');
  };

  const inp = 'form-input';
  const lbl = 'form-label';

  return (
    <div style={{ maxHeight: '82vh', overflowY: 'auto' }} className="space-y-0">

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4 text-sm text-blue-800">
        <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Rellena los datos y pulsa <strong>Descargar PDF rellenado</strong> — se generará el formulario oficial del Ministerio con todos los campos completados, listo para imprimir y firmar.</span>
      </div>

      {/* ── REPRESENTADO ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Datos del interesado (Representado)</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className={lbl}>Nombre</label><input className={inp} value={repdo.nombre} onChange={e => setR('nombre', e.target.value)} /></div>
          <div><label className={lbl}>1er Apellido</label><input className={inp} value={repdo.apellido1} onChange={e => setR('apellido1', e.target.value)} /></div>
          <div><label className={lbl}>2º Apellido</label><input className={inp} value={repdo.apellido2} onChange={e => setR('apellido2', e.target.value)} /></div>
          <div><label className={lbl}>Nacionalidad</label><input className={inp} value={repdo.nacionalidad} onChange={e => setR('nacionalidad', e.target.value)} /></div>
          <div><label className={lbl}>NIF</label><input className={inp} value={repdo.nif} onChange={e => setR('nif', e.target.value)} /></div>
          <div><label className={lbl}>Pasaporte Nº</label><input className={inp} value={repdo.pasaporte} onChange={e => setR('pasaporte', e.target.value)} /></div>
          <div>
            <label className={lbl}>Fecha de nacimiento</label>
            <div className="grid grid-cols-3 gap-1">
              <input className={inp} placeholder="DD" maxLength={2} value={repdo.fecha_nac_dd} onChange={e => setR('fecha_nac_dd', e.target.value)} />
              <input className={inp} placeholder="MM" maxLength={2} value={repdo.fecha_nac_mm} onChange={e => setR('fecha_nac_mm', e.target.value)} />
              <input className={inp} placeholder="AAAA" maxLength={4} value={repdo.fecha_nac_aaaa} onChange={e => setR('fecha_nac_aaaa', e.target.value)} />
            </div>
          </div>
          <div><label className={lbl}>Localidad nacimiento</label><input className={inp} value={repdo.localidad_nacimiento} onChange={e => setR('localidad_nacimiento', e.target.value)} /></div>
          <div><label className={lbl}>País</label><input className={inp} value={repdo.pais} onChange={e => setR('pais', e.target.value)} /></div>
          <div><label className={lbl}>Nombre del padre</label><input className={inp} value={repdo.nombre_padre} onChange={e => setR('nombre_padre', e.target.value)} /></div>
          <div><label className={lbl}>Nombre de la madre</label><input className={inp} value={repdo.nombre_madre} onChange={e => setR('nombre_madre', e.target.value)} /></div>
          <div>
            <label className={lbl}>Estado civil</label>
            <select className={inp} value={repdo.estado_civil} onChange={e => setR('estado_civil', e.target.value)}>
              <option value="">—</option>
              <option value="S">Soltero/a (S)</option>
              <option value="C">Casado/a (C)</option>
              <option value="V">Viudo/a (V)</option>
              <option value="D">Divorciado/a (D)</option>
              <option value="Sp">Separado/a (Sp)</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className={lbl}>Domicilio en España</label><input className={inp} value={repdo.domicilio} onChange={e => setR('domicilio', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>Nº</label><input className={inp} value={repdo.numero} onChange={e => setR('numero', e.target.value)} /></div>
            <div><label className={lbl}>Piso</label><input className={inp} value={repdo.piso} onChange={e => setR('piso', e.target.value)} /></div>
          </div>
          <div><label className={lbl}>Localidad</label><input className={inp} value={repdo.localidad} onChange={e => setR('localidad', e.target.value)} /></div>
          <div><label className={lbl}>C.P.</label><input className={inp} value={repdo.cp} onChange={e => setR('cp', e.target.value)} /></div>
          <div><label className={lbl}>Provincia</label><input className={inp} value={repdo.provincia} onChange={e => setR('provincia', e.target.value)} /></div>
          <div><label className={lbl}>Teléfono</label><input className={inp} value={repdo.telefono} onChange={e => setR('telefono', e.target.value)} /></div>
          <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowEmailDD(false); }}>
            <label className={lbl}>E-mail</label>
            <div className="flex gap-1">
              <input
                className={inp + ' flex-1'}
                value={repdo.email}
                onChange={e => { setR('email', e.target.value); }}
                onFocus={() => setShowEmailDD(true)}
                placeholder="email@ejemplo.com"
              />
            </div>
            {showEmailDD && emailSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {emailSuggestions.map(email => (
                  <div key={email} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 cursor-pointer group">
                    <span className="text-sm text-gray-700 flex-1" onClick={() => { setR('email', email); setShowEmailDD(false); }}>{email}</span>
                    <button type="button" onClick={() => removeEmailSuggestion(email)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-100">
                  <input
                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none"
                    placeholder="Añadir email…"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { addEmailSuggestion(newEmail); } }}
                  />
                  <button type="button" onClick={() => addEmailSuggestion(newEmail)} className="text-gray-500 hover:text-gray-800">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* ── REPRESENTANTE ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Datos del representante (Apoderado)</legend>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-500"><User className="w-3.5 h-3.5" /> Se guarda automáticamente</div>
          <button type="button" onClick={saveRepPerfil} className="btn btn-secondary btn-sm flex items-center gap-1">
            <Save className="w-3 h-3" /> {savedMsg ? '✓ Guardado' : 'Guardar perfil'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className={lbl}>DNI/NIF/NIE</label><input className={inp} value={repte.dni_nie} onChange={e => setT('dni_nie', e.target.value)} /></div>
          <div className="md:col-span-2"><label className={lbl}>Razón Social (si es empresa)</label><input className={inp} value={repte.razon_social} onChange={e => setT('razon_social', e.target.value)} /></div>
          <div><label className={lbl}>Nombre</label><input className={inp} value={repte.nombre} onChange={e => setT('nombre', e.target.value)} /></div>
          <div><label className={lbl}>1er Apellido</label><input className={inp} value={repte.apellido1} onChange={e => setT('apellido1', e.target.value)} /></div>
          <div><label className={lbl}>2º Apellido</label><input className={inp} value={repte.apellido2} onChange={e => setT('apellido2', e.target.value)} /></div>
          <div className="md:col-span-2"><label className={lbl}>Domicilio en España</label><input className={inp} value={repte.domicilio} onChange={e => setT('domicilio', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>Nº</label><input className={inp} value={repte.numero} onChange={e => setT('numero', e.target.value)} /></div>
            <div><label className={lbl}>Piso</label><input className={inp} value={repte.piso} onChange={e => setT('piso', e.target.value)} /></div>
          </div>
          <div><label className={lbl}>Localidad</label><input className={inp} value={repte.localidad} onChange={e => setT('localidad', e.target.value)} /></div>
          <div><label className={lbl}>C.P.</label><input className={inp} value={repte.cp} onChange={e => setT('cp', e.target.value)} /></div>
          <div><label className={lbl}>Provincia</label><input className={inp} value={repte.provincia} onChange={e => setT('provincia', e.target.value)} /></div>
          <div><label className={lbl}>Teléfono</label><input className={inp} value={repte.telefono} onChange={e => setT('telefono', e.target.value)} /></div>
          <div><label className={lbl}>E-mail</label><input className={inp} value={repte.email} onChange={e => setT('email', e.target.value)} /></div>
        </div>
      </fieldset>

      {/* ── SOLICITUD ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Tipo de solicitud / procedimiento</legend>
        <input className={inp} value={solicitud} onChange={e => setSolicitud(e.target.value)}
          placeholder="ej: solicitud de autorización de residencia temporal por arraigo social" />
        <p className="text-xs text-gray-400 mt-1">Este texto aparece en el cuerpo del documento: "…formule en mi nombre solicitud de <em>[este campo]</em>…"</p>
      </fieldset>

      {/* ── FECHA Y LUGAR ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Fecha y lugar de firma</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="md:col-span-1"><label className={lbl}>Lugar</label><input className={inp} value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Madrid" /></div>
          <div><label className={lbl}>Día</label><input className={inp} value={dia} maxLength={2} onChange={e => setDia(e.target.value)} /></div>
          <div>
            <label className={lbl}>Mes</label>
            <select className={inp} value={mes} onChange={e => setMes(e.target.value)}>
              {MESES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Año</label><input className={inp} value={anio} maxLength={4} onChange={e => setAnio(e.target.value)} /></div>
        </div>
      </fieldset>

      {/* ── PDF GENERADO (sin firmar) ── */}
      {savedPdfB64 && (
        <fieldset className="form-fieldset">
          <legend className="form-legend">Último PDF generado (sin firmar)</legend>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-gray-700">
              <FileText className="w-4 h-4 text-blue-500" />
              {savedPdfName}
            </span>
            <button
              type="button"
              onClick={downloadSavedPdf}
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Descargar
            </button>
            <button
              type="button"
              onClick={clearSavedPdf}
              className="text-gray-400 hover:text-red-500 ml-auto"
              title="Eliminar guardado"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Se guardó automáticamente al generar. Puedes descargarlo de nuevo si necesitas modificar los datos y regenerarlo.</p>
        </fieldset>
      )}

      {/* ── DOCUMENTO FIRMADO ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Documento firmado (adjuntar una vez firmado por el cliente)</legend>
        
        {uploadedSignedUrl ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Documento firmado subido correctamente</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <a
                href={uploadedSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> Ver documento
              </a>
              <button
                type="button"
                onClick={() => {
                  setUploadedSignedUrl(null);
                  setSignedFile(null);
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" /> Subir otro
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {signedFile ? 'Cambiar archivo' : 'Seleccionar PDF/imagen firmado'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => setSignedFile(e.target.files?.[0] || null)}
                />
              </label>
              {signedFile && (
                <>
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" /> {signedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = URL.createObjectURL(signedFile);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = signedFile.name;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadSigned}
                    disabled={uploadingSigned}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    {uploadingSigned ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo…</>
                    ) : (
                      <><Upload className="w-3.5 h-3.5" /> Subir a la app</>
                    )}
                  </button>
                  <button type="button" onClick={() => setSignedFile(null)} className="text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
            {!signedFile && (
              <p className="text-xs text-gray-400 mt-2">Una vez que el cliente firme el documento, adjúntalo aquí y súbelo a la app para que esté disponible para todo el equipo.</p>
            )}
          </>
        )}
      </fieldset>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* ── ACCIONES ── */}
      <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-white py-3 border-t border-gray-200">
        {onClose && <button type="button" onClick={onClose} className="btn btn-secondary">Cerrar</button>}
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generando…</>
            : <><Download className="w-4 h-4" /> Descargar PDF rellenado</>
          }
        </button>
      </div>
    </div>
  );
}
