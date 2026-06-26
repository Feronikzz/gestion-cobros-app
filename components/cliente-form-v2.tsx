'use client';

import { useState } from 'react';
import type { Cliente, ClienteInsert, EstadoProcedimiento } from '@/lib/supabase/types';
import { formatField } from '@/lib/utils/text';
import { usePerfilRepresentante } from '@/lib/hooks/use-perfil-representante';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { FileText, Download, RefreshCw, Upload, CheckCircle, X, Loader2, Printer } from 'lucide-react';
import { useConfirm } from '@/components/confirm-dialog';
import { SectionHeader } from '@/components/ui/section-header';
import {
  ClientePersonalSection,
  ClienteContactSection,
  ClienteDocumentosSection,
  ClienteRepresentanteSection,
  ClienteEstadoSection,
} from '@/components/cliente-form';
import type { DocIdentidadForm } from '@/components/cliente-form';

// Procedimiento inline (opcional al crear cliente)
interface ProcedimientoForm {
  titulo: string;
  concepto: string;
  presupuesto: number;
  tiene_entrada: boolean;
  importe_entrada: number;
  estado: EstadoProcedimiento;
}

interface ClienteFormV2Props {
  cliente?: Cliente;
  onSubmit: (data: Omit<ClienteInsert, 'user_id'>, docs: DocIdentidadForm[], proc: ProcedimientoForm | null) => Promise<void>;
  onCancel: () => void;
  initialDocs?: DocIdentidadForm[];
  allowProcedimiento?: boolean;
}

const emptyDoc: DocIdentidadForm = { tipo: 'DNI', numero: '', fecha_expedicion: '', fecha_caducidad: '', es_principal: false };
const emptyProc: ProcedimientoForm = { titulo: '', concepto: '', presupuesto: 0, tiene_entrada: false, importe_entrada: 0, estado: 'pendiente_presentar' };

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function parseDireccion(direccion?: string | null): { calle: string; numero: string; piso: string } {
  if (!direccion) return { calle: '', numero: '', piso: '' };
  const match = direccion.match(/^(.+?)\s+(\d+)(?:\s*,?\s*(.+))?$/);
  if (match) return { calle: match[1].trim(), numero: match[2] || '', piso: match[3] ? match[3].trim() : '' };
  return { calle: direccion, numero: '', piso: '' };
}

function parseFechaNacimiento(f?: string | null): { dd: string; mm: string; aaaa: string } {
  if (!f) return { dd: '', mm: '', aaaa: '' };
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return { dd: '', mm: '', aaaa: '' };
    return { dd: String(d.getDate()).padStart(2, '0'), mm: String(d.getMonth() + 1).padStart(2, '0'), aaaa: String(d.getFullYear()) };
  } catch { return { dd: '', mm: '', aaaa: '' }; }
}

function cleanNotasLegacy(notas: string | null): string {
  return (notas ?? '').replace(/\[DESIGNACION:.+?\]\n?/, '').trim();
}

export function ClienteFormV2({ cliente, onSubmit, onCancel, initialDocs, allowProcedimiento = true }: ClienteFormV2Props) {
  const supabase = typeof window !== 'undefined' ? createClient() : null;
  const { confirm } = useConfirm();
  const { perfil: repte, setPerfil: setRepte, savePerfil: saveRepte, saving: savingRepte } = usePerfilRepresentante();

  const dirParsed = parseDireccion(cliente?.direccion);

  // ─── Datos del cliente (representado) ───
  const [formData, setFormData] = useState({
    nombre: cliente?.nombre ?? '',
    apellido1: cliente?.apellido1 ?? (cliente?.apellidos ? cliente.apellidos.split(' ')[0] : ''),
    apellido2: cliente?.apellido2 ?? (cliente?.apellidos ? cliente.apellidos.split(' ').slice(1).join(' ') : ''),
    telefono: cliente?.telefono ?? '',
    telefono2: cliente?.telefono2 ?? '',
    email: cliente?.email ?? '',
    direccion_calle: dirParsed.calle,
    direccion_numero: dirParsed.numero,
    direccion_piso: dirParsed.piso,
    codigo_postal: cliente?.codigo_postal ?? '',
    localidad: cliente?.localidad ?? '',
    provincia: cliente?.provincia ?? '',
    fecha_nacimiento: cliente?.fecha_nacimiento ?? (cliente?.anio_nacimiento ? `${cliente.anio_nacimiento}-01-01` : ''),
    nacionalidad: cliente?.nacionalidad ?? '',
    fecha_entrada: cliente?.fecha_entrada ?? new Date().toISOString().split('T')[0],
    estado: cliente?.estado ?? ('activo' as Cliente['estado']),
    notas: cleanNotasLegacy(cliente?.notas ?? null),
    documento_tipo: cliente?.documento_tipo ?? '',
    documento_numero: cliente?.documento_numero ?? '',
    documento_caducidad: cliente?.documento_caducidad ?? '',
    carpeta_local: cliente?.carpeta_local ?? '',
    nombre_padre: cliente?.nombre_padre ?? '',
    nombre_madre: cliente?.nombre_madre ?? '',
    estado_civil: cliente?.estado_civil ?? '',
    localidad_nacimiento: cliente?.localidad_nacimiento ?? '',
    pais_nacimiento: cliente?.pais_nacimiento ?? '',
    pasaporte: cliente?.pasaporte ?? '',
  });

  // ─── Documentos de identidad ───
  const [documentos, setDocumentos] = useState<DocIdentidadForm[]>(
    initialDocs && initialDocs.length > 0
      ? initialDocs
      : [{ ...emptyDoc, es_principal: true, tipo: cliente?.documento_tipo || 'DNI', numero: cliente?.documento_numero || '', fecha_caducidad: cliente?.documento_caducidad || '' }]
  );

  // ─── Procedimiento opcional ───
  const [addProc, setAddProc] = useState(false);
  const [procForm, setProcForm] = useState<ProcedimientoForm>({ ...emptyProc });

  // ─── Designación PDF ───
  const today = new Date();
  const [solicitud, setSolicitud] = useState(cliente?.designacion_solicitud ?? '');
  const [consentimientoDehu, setConsentimientoDehu] = useState(cliente?.designacion_consentimiento_dehu ?? false);
  const [lugar, setLugar] = useState(cliente?.designacion_lugar ?? '');
  const [dia, setDia] = useState(cliente?.designacion_dia ?? String(today.getDate()));
  const [mes, setMes] = useState(cliente?.designacion_mes ?? MESES[today.getMonth()]);
  const [anio, setAnio] = useState(cliente?.designacion_anio ?? String(today.getFullYear()));
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [savedRepMsg, setSavedRepMsg] = useState(false);

  // Signed upload
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [uploadedSignedUrl, setUploadedSignedUrl] = useState<string | null>(null);

  // ─── Secciones colapsables ───
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contacto: true,
    designacion: !!cliente,
    documentos: true,
    representante: !!cliente,
    estado: true,
    procedimiento: false,
  });

  const [loading, setLoading] = useState(false);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const set = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));
  const setT = (key: string, value: string) => setRepte(prev => ({ ...prev, [key]: value }));

  // ─── Email suggestions helpers ───
  const addEmailSuggestion = (email: string) => {
    if (!email || repte.emails_sugeridos.includes(email)) return;
    const updated = [...repte.emails_sugeridos, email];
    setRepte(prev => ({ ...prev, emails_sugeridos: updated }));
  };

  const removeEmailSuggestion = (email: string) => {
    const updated = repte.emails_sugeridos.filter((e: string) => e !== email);
    setRepte(prev => ({ ...prev, emails_sugeridos: updated }));
  };

  // ─── Documentos helpers ───
  const addDocumento = () => setDocumentos(prev => [...prev, { ...emptyDoc }]);
  const removeDocumento = (index: number) => {
    setDocumentos(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (prev[index].es_principal && next.length > 0) next[0].es_principal = true;
      return next;
    });
  };
  const updateDocumento = (index: number, field: keyof DocIdentidadForm, value: string | boolean) => {
    setDocumentos(prev => {
      const next = [...prev];
      if (field === 'es_principal' && value === true) {
        next.forEach((d, i) => { d.es_principal = i === index; });
      } else {
        (next[index] as any)[field] = value;
      }
      return next;
    });
  };

  // ─── Validate fields for PDF ───
  const validateDesignacionFields = (): string[] => {
    const missing: string[] = [];
    if (!formData.nombre) missing.push('Nombre del interesado');
    if (!formData.apellido1) missing.push('1er Apellido del interesado');
    if (!formData.nacionalidad) missing.push('Nacionalidad');
    if (!formData.fecha_nacimiento) missing.push('Fecha de nacimiento');
    if (!formData.localidad_nacimiento) missing.push('Localidad de nacimiento');
    if (!formData.nombre_padre) missing.push('Nombre del padre');
    if (!formData.nombre_madre) missing.push('Nombre de la madre');
    if (!formData.estado_civil) missing.push('Estado civil');
    if (!repte.dni_nie) missing.push('DNI/NIF/NIE del representante');
    if (!repte.nombre) missing.push('Nombre del representante');
    if (!repte.apellido1) missing.push('Apellido del representante');
    if (!repte.domicilio) missing.push('Domicilio del representante');
    if (!repte.localidad) missing.push('Localidad del representante');
    if (!repte.cp) missing.push('C.P. del representante');
    if (!repte.provincia) missing.push('Provincia del representante');
    if (!repte.telefono) missing.push('Teléfono del representante');
    if (!repte.email) missing.push('Email del representante');
    if (!solicitud) missing.push('Tipo de solicitud');
    if (!lugar) missing.push('Lugar de firma');
    return missing;
  };

  // ─── Generate designación PDF ───
  const handleGeneratePdf = async () => {
    setPdfError(null);
    const missing = validateDesignacionFields();
    if (missing.length > 0) {
      const proceed = await confirm({
        title: 'Faltan datos',
        message: `⚠️ Faltan los siguientes campos para la designación:\n\n• ${missing.join('\n• ')}\n\n¿Deseas generar el PDF de todas formas con los campos vacíos?`,
        variant: 'warning',
        confirmLabel: 'Generar PDF'
      });
      if (!proceed) return;
    }

    setGeneratingPdf(true);
    try {
      const fnac = parseFechaNacimiento(formData.fecha_nacimiento);
      const docPrincipal = documentos.find(d => d.es_principal) || documentos[0];

      const representado = {
        nombre: formData.nombre, apellido1: formData.apellido1, apellido2: formData.apellido2,
        nacionalidad: formData.nacionalidad,
        nif: docPrincipal?.numero || formData.documento_numero || '',
        pasaporte: formData.pasaporte,
        fecha_nac_dd: fnac.dd, fecha_nac_mm: fnac.mm, fecha_nac_aaaa: fnac.aaaa,
        localidad_nacimiento: formData.localidad_nacimiento,
        pais_nacimiento: formData.pais_nacimiento,
        nombre_padre: formData.nombre_padre,
        nombre_madre: formData.nombre_madre,
        estado_civil: formData.estado_civil,
        domicilio: formData.direccion_calle,
        numero: formData.direccion_numero,
        piso: formData.direccion_piso,
        localidad: formData.localidad,
        cp: formData.codigo_postal,
        provincia: formData.provincia,
        telefono: formData.telefono,
        email: formData.email,
      };

      const representante = {
        dni_nie: repte.dni_nie, razon_social: repte.razon_social,
        nombre: repte.nombre, apellido1: repte.apellido1, apellido2: repte.apellido2,
        domicilio: repte.domicilio, numero: repte.numero, piso: repte.piso,
        localidad: repte.localidad, cp: repte.cp, provincia: repte.provincia,
        telefono: repte.telefono, email: repte.email,
      };

      const res = await fetch('/api/fill-designacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          representado, representante, solicitud,
          consentimiento_dehu: consentimientoDehu,
          lugar, dia, mes, anio,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const nombreCompleto = [formData.nombre, formData.apellido1, formData.apellido2].filter(Boolean).join(' ');
      a.download = `designacion-representante-${nombreCompleto.replace(/\s+/g, '_') || 'cliente'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF generado correctamente');
    } catch (error: any) {
      console.error('Error generando PDF:', error);
      setPdfError(error.message || 'Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ─── Upload signed document ───
  const handleUploadSigned = async () => {
    if (!signedFile || !supabase || !cliente?.id) return;
    setUploadingSigned(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      const filePath = `${user.id}/designaciones/${Date.now()}_firmado_${signedFile.name}`;
      const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, signedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(filePath);
      await supabase.from('documentos').insert({
        user_id: user.id, cliente_id: cliente.id,
        nombre: `Designación representante — Firmado`,
        tipo: 'DESIGNACION_FIRMADA', archivo_url: publicUrl,
      });
      setUploadedSignedUrl(publicUrl);
      setSignedFile(null);
    } catch (error: any) {
      console.error('Error subiendo designación firmada:', error);
      toast.error('Error al subir: ' + error.message);
    } finally {
      setUploadingSigned(false);
    }
  };

  // ─── Submit (save client) ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docPrincipal = documentos.find(d => d.es_principal) || documentos[0];
      const direccionCombinada = [formData.direccion_calle, formData.direccion_numero, formData.direccion_piso].filter(Boolean).join(', ');
      const apellidosCombinado = [formData.apellido1, formData.apellido2].filter(Boolean).join(' ');

      const clienteData: Omit<ClienteInsert, 'user_id'> = {
        nombre: formatField(formData.nombre, 'name'),
        apellidos: apellidosCombinado ? formatField(apellidosCombinado, 'name') : null,
        apellido1: formData.apellido1 ? formatField(formData.apellido1, 'name') : null,
        apellido2: formData.apellido2 ? formatField(formData.apellido2, 'name') : null,
        nif: docPrincipal?.numero ? formatField(docPrincipal.numero, 'nif') : (formData.documento_numero || null),
        telefono: formData.telefono ? formatField(formData.telefono, 'phone') : null,
        telefono2: formData.telefono2 ? formatField(formData.telefono2, 'phone') : null,
        email: formData.email ? formatField(formData.email, 'email') : null,
        direccion: direccionCombinada ? formatField(direccionCombinada, 'address') : null,
        codigo_postal: formData.codigo_postal || null,
        localidad: formData.localidad || null,
        provincia: formData.provincia || null,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        anio_nacimiento: formData.fecha_nacimiento ? parseInt(formData.fecha_nacimiento.slice(0, 4)) : null,
        nacionalidad: formData.nacionalidad || null,
        fecha_entrada: formData.fecha_entrada,
        documento_tipo: docPrincipal?.tipo || formData.documento_tipo || null,
        documento_numero: docPrincipal?.numero || formData.documento_numero || null,
        documento_caducidad: docPrincipal?.fecha_caducidad || formData.documento_caducidad || null,
        estado: formData.estado as Cliente['estado'],
        notas: formData.notas?.trim() || null,
        carpeta_local: formData.carpeta_local || null,
        nombre_padre: formData.nombre_padre || null,
        nombre_madre: formData.nombre_madre || null,
        estado_civil: formData.estado_civil || null,
        localidad_nacimiento: formData.localidad_nacimiento || null,
        pais_nacimiento: formData.pais_nacimiento || null,
        pasaporte: formData.pasaporte || null,
        designacion_lugar: lugar || null,
        designacion_dia: dia || null,
        designacion_mes: mes || null,
        designacion_anio: anio || null,
        designacion_solicitud: solicitud || null,
        designacion_consentimiento_dehu: consentimientoDehu,
      };

      const procData = addProc && procForm.titulo ? procForm : null;
      await onSubmit(clienteData, documentos.filter(d => d.numero), procData);
      await saveRepte(repte);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const inp = 'form-input';
  const lbl = 'form-label';

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ maxHeight: '80vh', overflowY: 'auto' }}>

      {/* ═══ DATOS DEL INTERESADO ═══ */}
      <ClientePersonalSection formData={formData} set={set} expanded={expandedSections.personal} onToggle={() => toggleSection('personal')} />

      {/* ═══ CONTACTO Y DOMICILIO ═══ */}
      <ClienteContactSection
        formData={formData}
        set={set}
        emailsSugeridos={repte.emails_sugeridos}
        onAddEmail={addEmailSuggestion}
        onRemoveEmail={removeEmailSuggestion}
        expanded={expandedSections.contacto}
        onToggle={() => toggleSection('contacto')}
      />

      {/* ═══ DOCUMENTOS DE IDENTIDAD ═══ */}
      <ClienteDocumentosSection
        documentos={documentos}
        onAdd={addDocumento}
        onRemove={removeDocumento}
        onUpdate={updateDocumento}
        expanded={expandedSections.documentos}
        onToggle={() => toggleSection('documentos')}
      />

      {/* ═══ REPRESENTANTE ═══ */}
      <ClienteRepresentanteSection
        repte={repte}
        setT={setT}
        onSaveRepte={async () => { await saveRepte(repte); setSavedRepMsg(true); setTimeout(() => setSavedRepMsg(false), 2000); }}
        savingRepte={savingRepte}
        savedRepMsg={savedRepMsg}
        expanded={expandedSections.representante}
        onToggle={() => toggleSection('representante')}
      />

      {/* ═══ DESIGNACIÓN PDF ═══ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Generar designación de representante" icon={<Printer className="w-4 h-4 text-gray-500" />} expanded={expandedSections.designacion} onToggle={() => toggleSection('designacion')} />
        {expandedSections.designacion && (
          <div className="mt-3 space-y-4">
            <div>
              <label className={lbl}>Tipo de solicitud / procedimiento</label>
              <input className={inp} value={solicitud} onChange={e => setSolicitud(e.target.value)} placeholder="ej: solicitud de autorización de residencia temporal por arraigo social" />
              <p className="text-xs text-gray-400 mt-1">Aparece en: "…formule en mi nombre solicitud de <em>[este campo]</em>…"</p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <input type="checkbox" checked={consentimientoDehu} onChange={e => setConsentimientoDehu(e.target.checked)} className="form-checkbox mt-0.5" id="dehu-consent" />
              <label htmlFor="dehu-consent" className="text-sm text-gray-700 cursor-pointer">
                <strong>CONSIENTO</strong> que las comunicaciones y notificaciones se realicen mediante puesta a disposición en la Dirección Electrónica Habilitada Única (DEHú), para lo cual será obligatorio disponer de certificado electrónico válido o sistema Cl@ve.
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className={lbl}>Lugar</label><input className={inp} value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Madrid" /></div>
              <div><label className={lbl}>Día</label><input className={inp} value={dia} maxLength={2} onChange={e => setDia(e.target.value)} /></div>
              <div>
                <label className={lbl}>Mes</label>
                <select className={inp} value={mes} onChange={e => setMes(e.target.value)}>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Año</label><input className={inp} value={anio} maxLength={4} onChange={e => setAnio(e.target.value)} /></div>
            </div>

            {pdfError && <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{pdfError}</div>}

            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={handleGeneratePdf} disabled={generatingPdf} className="btn btn-primary btn-sm flex items-center gap-2">
                {generatingPdf ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generando…</> : <><Download className="w-4 h-4" /> Descargar PDF designación</>}
              </button>
              <p className="text-xs text-gray-400">Se genera el PDF editable del Ministerio con todos los datos rellenados.</p>
            </div>

            {/* Upload signed document */}
            {cliente?.id && (
              <div className="border-t border-gray-100 pt-3">
                <p className={`${lbl} mb-2`}>Subir designación firmada</p>
                {uploadedSignedUrl ? (
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <CheckCircle className="w-4 h-4" /> Documento firmado subido correctamente
                    <button type="button" onClick={() => { setUploadedSignedUrl(null); setSignedFile(null); }} className="text-gray-400 hover:text-red-500 text-xs underline ml-2">Subir otro</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="btn btn-secondary btn-sm cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {signedFile ? 'Cambiar archivo' : 'Seleccionar PDF firmado'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setSignedFile(e.target.files?.[0] || null)} />
                    </label>
                    {signedFile && (
                      <>
                        <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="w-4 h-4" /> {signedFile.name}</span>
                        <button type="button" onClick={handleUploadSigned} disabled={uploadingSigned} className="btn btn-primary btn-sm flex items-center gap-1.5">
                          {uploadingSigned ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo…</> : <><Upload className="w-3.5 h-3.5" /> Subir firmado</>}
                        </button>
                        <button type="button" onClick={() => setSignedFile(null)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </fieldset>

      {/* ═══ ESTADO Y NOTAS ═══ */}
      <ClienteEstadoSection formData={formData} set={set} expanded={expandedSections.estado} onToggle={() => toggleSection('estado')} />

      {/* ═══ PROCEDIMIENTO DIRECTO (OPCIONAL) ═══ */}
      {allowProcedimiento && !cliente && (
        <fieldset className="form-fieldset">
          <div className="flex items-center justify-between py-2">
            <SectionHeader title="Añadir procedimiento (opcional)" icon={<FileText className="w-4 h-4 text-gray-500" />} expanded={expandedSections.procedimiento} onToggle={() => toggleSection('procedimiento')} />
            <label className="flex items-center gap-2 cursor-pointer mr-2">
              <input type="checkbox" checked={addProc} onChange={e => { setAddProc(e.target.checked); if (e.target.checked) setExpandedSections(prev => ({ ...prev, procedimiento: true })); }} className="form-checkbox" />
              <span className="text-xs text-gray-600">Crear</span>
            </label>
          </div>
          {addProc && expandedSections.procedimiento && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
              <div><label className={lbl}>Título *</label><input type="text" value={procForm.titulo} onChange={e => setProcForm({ ...procForm, titulo: e.target.value })} className={inp} placeholder="Ej: Solicitud NIE" required={addProc} /></div>
              <div><label className={lbl}>Concepto *</label><input type="text" value={procForm.concepto} onChange={e => setProcForm({ ...procForm, concepto: e.target.value })} className={inp} placeholder="Ej: Tramitación NIE" required={addProc} /></div>
              <div><label className={lbl}>Presupuesto *</label><input type="number" step="0.01" min="0" value={procForm.presupuesto} onChange={e => setProcForm({ ...procForm, presupuesto: parseFloat(e.target.value) || 0 })} className={inp} required={addProc} /></div>
              <div>
                <label className={lbl}>Estado inicial</label>
                <select value={procForm.estado} onChange={e => setProcForm({ ...procForm, estado: e.target.value as EstadoProcedimiento })} className={inp}>
                  <option value="pendiente_presentar">Pte. presentar</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={procForm.tiene_entrada} onChange={e => setProcForm({ ...procForm, tiene_entrada: e.target.checked })} className="form-checkbox" />
                  <span className={lbl} style={{ margin: 0 }}>¿Paga entrada?</span>
                </label>
                {procForm.tiene_entrada && (
                  <div className="flex items-center gap-2">
                    <label className={`${lbl} text-xs`} style={{ margin: 0 }}>Importe:</label>
                    <input type="number" step="0.01" min="0" value={procForm.importe_entrada || ''} onChange={e => setProcForm({ ...procForm, importe_entrada: parseFloat(e.target.value) || 0 })} className={inp} style={{ width: '120px' }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </fieldset>
      )}

      {/* ═══ ACCIONES ═══ */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 mt-2 sticky bottom-0 bg-white py-3">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : cliente ? 'Actualizar cliente' : addProc ? 'Crear cliente y procedimiento' : 'Crear cliente'}
        </button>
      </div>
    </form>
  );
}
