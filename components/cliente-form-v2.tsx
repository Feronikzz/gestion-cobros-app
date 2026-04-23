'use client';

import { useState, useRef } from 'react';
import type { Cliente, ClienteInsert, EstadoProcedimiento } from '@/lib/supabase/types';
import { formatField } from '@/lib/utils/text';
import { usePerfilRepresentante } from '@/lib/hooks/use-perfil-representante';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { User, FileText, Plus, Trash2, ChevronDown, ChevronUp, FileSignature, Download, Save, RefreshCw, Upload, CheckCircle, X, Loader2, Printer } from 'lucide-react';

// Documento de identidad en formulario (antes de guardar en BD)
interface DocIdentidadForm {
  tipo: string;
  numero: string;
  fecha_expedicion: string;
  fecha_caducidad: string;
  es_principal: boolean;
}

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
  /** Si true, muestra la sección de crear procedimiento junto al cliente */
  allowProcedimiento?: boolean;
}

const emptyDoc: DocIdentidadForm = { tipo: 'DNI', numero: '', fecha_expedicion: '', fecha_caducidad: '', es_principal: false };
const emptyProc: ProcedimientoForm = { titulo: '', concepto: '', presupuesto: 0, tiene_entrada: false, importe_entrada: 0, estado: 'pendiente_presentar' };

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// Parsear dirección para separar calle, número y piso
function parseDireccion(direccion?: string | null): { calle: string; numero: string; piso: string } {
  if (!direccion) return { calle: '', numero: '', piso: '' };
  const match = direccion.match(/^(.+?)\s+(\d+)(?:\s*,?\s*(.+))?$/);
  if (match) return { calle: match[1].trim(), numero: match[2] || '', piso: match[3] ? match[3].trim() : '' };
  return { calle: direccion, numero: '', piso: '' };
}

// Parsear fecha YYYY-MM-DD a DD, MM, AAAA
function parseFechaNacimiento(f?: string | null): { dd: string; mm: string; aaaa: string } {
  if (!f) return { dd: '', mm: '', aaaa: '' };
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return { dd: '', mm: '', aaaa: '' };
    return { dd: String(d.getDate()).padStart(2, '0'), mm: String(d.getMonth() + 1).padStart(2, '0'), aaaa: String(d.getFullYear()) };
  } catch { return { dd: '', mm: '', aaaa: '' }; }
}

// Limpiar notas viejas que contenían metadatos de designación (legacy)
function cleanNotasLegacy(notas: string | null): string {
  return (notas ?? '').replace(/\[DESIGNACION:.+?\]\n?/, '').trim();
}

export function ClienteFormV2({ cliente, onSubmit, onCancel, initialDocs, allowProcedimiento = true }: ClienteFormV2Props) {
  const supabase = typeof window !== 'undefined' ? createClient() : null;
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
    // Campos designación (almacenados directamente en la tabla clientes)
    nombre_padre: cliente?.nombre_padre ?? '',
    nombre_madre: cliente?.nombre_madre ?? '',
    estado_civil: cliente?.estado_civil ?? '',
    localidad_nacimiento: cliente?.localidad_nacimiento ?? '',
    pais_nacimiento: cliente?.pais_nacimiento ?? '',
    pasaporte: cliente?.pasaporte ?? '',
  });

  // ─── Documentos de identidad ───
  const [documentos, setDocumentos] = useState<DocIdentidadForm[]>(
    initialDocs && initialDocs.length > 0 ? initialDocs : [{ ...emptyDoc, es_principal: true }]
  );

  // ─── Procedimiento opcional ───
  const [addProc, setAddProc] = useState(false);
  const [procForm, setProcForm] = useState<ProcedimientoForm>({ ...emptyProc });

  // ─── Designación PDF ───
  const today = new Date();
  const [solicitud, setSolicitud] = useState('');
  const [consentimientoDehu, setConsentimientoDehu] = useState(false);
  const [lugar, setLugar] = useState('');
  const [dia, setDia] = useState(String(today.getDate()));
  const [mes, setMes] = useState(MESES[today.getMonth()]);
  const [anio, setAnio] = useState(String(today.getFullYear()));
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [savedRepMsg, setSavedRepMsg] = useState(false);

  // Signed upload
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [uploadedSignedUrl, setUploadedSignedUrl] = useState<string | null>(null);

  // Email dropdown
  const [showEmailDD, setShowEmailDD] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const emailRef = useRef<HTMLDivElement>(null);

  // ─── Secciones colapsables ───
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contacto: true,
    designacion: !!cliente, // Open by default when editing
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
    setNewEmail('');
  };

  const removeEmailSuggestion = (email: string) => {
    const updated = repte.emails_sugeridos.filter(e => e !== email);
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
    if (!formData.direccion_calle) missing.push('Domicilio (calle) del interesado');
    if (!formData.direccion_numero) missing.push('Nº del domicilio del interesado');
    if (!formData.localidad) missing.push('Localidad del interesado');
    if (!formData.codigo_postal) missing.push('C.P. del interesado');
    if (!formData.provincia) missing.push('Provincia del interesado');
    if (!formData.telefono) missing.push('Teléfono del interesado');
    if (!formData.email) missing.push('Email del interesado');
    const docPrincipal = documentos.find(d => d.es_principal) || documentos[0];
    if (!docPrincipal?.numero && !formData.documento_numero) missing.push('NIF/NIE del interesado');
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

    // Validate required fields
    const missing = validateDesignacionFields();
    if (missing.length > 0) {
      const proceed = window.confirm(
        `⚠️ Faltan los siguientes campos para la designación:\n\n• ${missing.join('\n• ')}\n\n¿Deseas generar el PDF de todas formas con los campos vacíos?`
      );
      if (!proceed) return;
    }

    setGeneratingPdf(true);
    try {
      const fnac = parseFechaNacimiento(formData.fecha_nacimiento);
      const docPrincipal = documentos.find(d => d.es_principal) || documentos[0];

      const representado = {
        nombre: formData.nombre,
        apellido1: formData.apellido1,
        apellido2: formData.apellido2,
        nacionalidad: formData.nacionalidad,
        nif: docPrincipal?.numero || formData.documento_numero || '',
        pasaporte: formData.pasaporte,
        fecha_nac_dd: fnac.dd,
        fecha_nac_mm: fnac.mm,
        fecha_nac_aaaa: fnac.aaaa,
        localidad_nacimiento: formData.localidad_nacimiento,
        pais: formData.pais_nacimiento || formData.nacionalidad,
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
        dni_nie: repte.dni_nie,
        razon_social: repte.razon_social,
        nombre: repte.nombre,
        apellido1: repte.apellido1,
        apellido2: repte.apellido2,
        domicilio: repte.domicilio,
        numero: repte.numero,
        piso: repte.piso,
        localidad: repte.localidad,
        cp: repte.cp,
        provincia: repte.provincia,
        telefono: repte.telefono,
        email: repte.email,
      };

      const res = await fetch('/api/fill-designacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          representado,
          representante,
          solicitud,
          consentimiento_dehu: consentimientoDehu,
          fecha_lugar: { lugar, dia, mes, anio },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al generar el PDF');
      }

      const blob = await res.blob();
      const fileName = `designacion-${(formData.apellido1 || formData.nombre || 'cliente').replace(/\s+/g, '_')}.pdf`;

      // If editing existing client, save doc to Supabase with tag 'No firmado'
      if (cliente?.id && supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const filePath = `${user.id}/designaciones/${Date.now()}_${fileName}`;
            const { error: uploadError } = await supabase.storage
              .from('documentos')
              .upload(filePath, blob);

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('documentos')
                .getPublicUrl(filePath);

              await supabase.from('documentos').insert({
                user_id: user.id,
                cliente_id: cliente.id,
                nombre: `Designación representante — No firmado`,
                tipo: 'DESIGNACION_NO_FIRMADA',
                archivo_url: publicUrl,
              });
            }
          }
        } catch (e) {
          console.error('Error guardando designación en BD:', e);
        }
      }

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // Also save representante profile
      await saveRepte(repte);
    } catch (e: any) {
      setPdfError(e.message);
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
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, signedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      await supabase.from('documentos').insert({
        user_id: user.id,
        cliente_id: cliente.id,
        nombre: `Designación representante — Firmado`,
        tipo: 'DESIGNACION_FIRMADA',
        archivo_url: publicUrl,
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

      // Combine address fields back into single direccion for DB
      const direccionCombinada = [formData.direccion_calle, formData.direccion_numero, formData.direccion_piso].filter(Boolean).join(', ');
      // Combine apellidos for legacy field
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
        // Campos designación
        nombre_padre: formData.nombre_padre || null,
        nombre_madre: formData.nombre_madre || null,
        estado_civil: formData.estado_civil || null,
        localidad_nacimiento: formData.localidad_nacimiento || null,
        pais_nacimiento: formData.pais_nacimiento || null,
        pasaporte: formData.pasaporte || null,
      };

      const procData = addProc && procForm.titulo ? procForm : null;
      await onSubmit(clienteData, documentos.filter(d => d.numero), procData);

      // Also save representante profile on every submit
      await saveRepte(repte);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ title, icon, section }: { title: string; icon: React.ReactNode; section: keyof typeof expandedSections }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-2 text-left"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="form-legend" style={{ margin: 0, cursor: 'pointer' }}>{title}</span>
      </div>
      {expandedSections[section] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );

  const inp = 'form-input';
  const lbl = 'form-label';

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ maxHeight: '80vh', overflowY: 'auto' }}>

      {/* ═══ DATOS DEL INTERESADO (REPRESENTADO) ═══ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Datos del interesado (cliente)" icon={<User className="w-4 h-4 text-gray-500" />} section="personal" />
        {expandedSections.personal && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className={lbl}>Nombre *</label>
              <input type="text" value={formData.nombre} onChange={e => set('nombre', e.target.value)} className={inp} required placeholder="Nombre" />
            </div>
            <div>
              <label className={lbl}>1er Apellido</label>
              <input type="text" value={formData.apellido1} onChange={e => set('apellido1', e.target.value)} className={inp} placeholder="Primer apellido" />
            </div>
            <div>
              <label className={lbl}>2º Apellido</label>
              <input type="text" value={formData.apellido2} onChange={e => set('apellido2', e.target.value)} className={inp} placeholder="Segundo apellido" />
            </div>
            <div>
              <label className={lbl}>Nacionalidad</label>
              <input type="text" value={formData.nacionalidad} onChange={e => set('nacionalidad', e.target.value)} className={inp} placeholder="Española" />
            </div>
            <div>
              <label className={lbl}>Fecha de nacimiento</label>
              <input type="date" value={formData.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Localidad nacimiento</label>
              <input type="text" value={formData.localidad_nacimiento} onChange={e => set('localidad_nacimiento', e.target.value)} className={inp} placeholder="Ciudad" />
            </div>
            <div>
              <label className={lbl}>País nacimiento</label>
              <input type="text" value={formData.pais_nacimiento} onChange={e => set('pais_nacimiento', e.target.value)} className={inp} placeholder="España" />
            </div>
            <div>
              <label className={lbl}>Nombre del padre</label>
              <input type="text" value={formData.nombre_padre} onChange={e => set('nombre_padre', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Nombre de la madre</label>
              <input type="text" value={formData.nombre_madre} onChange={e => set('nombre_madre', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Estado civil</label>
              <select value={formData.estado_civil} onChange={e => set('estado_civil', e.target.value)} className={inp}>
                <option value="">—</option>
                <option value="S">Soltero/a</option>
                <option value="C">Casado/a</option>
                <option value="V">Viudo/a</option>
                <option value="D">Divorciado/a</option>
                <option value="Sp">Separado/a</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Pasaporte Nº</label>
              <input type="text" value={formData.pasaporte} onChange={e => set('pasaporte', e.target.value)} className={inp} placeholder="Nº pasaporte" />
            </div>
          </div>
        )}
      </fieldset>

      {/* ═══ CONTACTO Y DOMICILIO ═══ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Contacto y domicilio" icon={<User className="w-4 h-4 text-gray-500" />} section="contacto" />
        {expandedSections.contacto && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className={lbl}>Teléfono</label>
              <input type="tel" value={formData.telefono} onChange={e => set('telefono', e.target.value)} className={inp} placeholder="600 000 000" />
            </div>
            <div>
              <label className={lbl}>2º teléfono</label>
              <input type="tel" value={formData.telefono2} onChange={e => set('telefono2', e.target.value)} className={inp} placeholder="912 345 678" />
            </div>
            <div className="relative" ref={emailRef}>
              <label className={lbl}>E-mail</label>
              <input
                className={inp}
                value={formData.email}
                onChange={e => set('email', e.target.value)}
                onFocus={() => setShowEmailDD(true)}
                onBlur={(e) => {
                  // Only close if focus goes outside the container
                  if (!emailRef.current?.contains(e.relatedTarget as Node)) {
                    setTimeout(() => setShowEmailDD(false), 150);
                  }
                }}
                placeholder="email@ejemplo.com"
              />
              {showEmailDD && repte.emails_sugeridos.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {repte.emails_sugeridos.map(email => (
                    <div key={email} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 cursor-pointer group">
                      <span
                        className="text-sm text-gray-700 flex-1"
                        onMouseDown={(e) => { e.preventDefault(); set('email', email); setShowEmailDD(false); }}
                      >{email}</span>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); removeEmailSuggestion(email); }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmailSuggestion(newEmail); } }}
                    />
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); addEmailSuggestion(newEmail); }} className="text-gray-500 hover:text-gray-800">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-1">
              <label className={lbl}>Domicilio (calle)</label>
              <input type="text" value={formData.direccion_calle} onChange={e => set('direccion_calle', e.target.value)} className={inp} placeholder="Calle Mayor" />
            </div>
            <div>
              <label className={lbl}>Nº</label>
              <input type="text" value={formData.direccion_numero} onChange={e => set('direccion_numero', e.target.value)} className={inp} placeholder="12" />
            </div>
            <div>
              <label className={lbl}>Piso</label>
              <input type="text" value={formData.direccion_piso} onChange={e => set('direccion_piso', e.target.value)} className={inp} placeholder="3ºA" />
            </div>
            <div>
              <label className={lbl}>C.P.</label>
              <input type="text" value={formData.codigo_postal} onChange={e => set('codigo_postal', e.target.value)} className={inp} placeholder="28001" maxLength={5} />
            </div>
            <div>
              <label className={lbl}>Localidad</label>
              <input type="text" value={formData.localidad} onChange={e => set('localidad', e.target.value)} className={inp} placeholder="Madrid" />
            </div>
            <div>
              <label className={lbl}>Provincia</label>
              <input type="text" value={formData.provincia} onChange={e => set('provincia', e.target.value)} className={inp} placeholder="Madrid" />
            </div>
          </div>
        )}
      </fieldset>

      {/* ═══ DOCUMENTOS DE IDENTIDAD ═══ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Documentos de identidad" icon={<FileText className="w-4 h-4 text-gray-500" />} section="documentos" />
        {expandedSections.documentos && (
          <div className="mt-3 space-y-4">
            {documentos.map((doc, index) => (
              <div key={index} className={`p-3 rounded-lg border ${doc.es_principal ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="doc_principal" checked={doc.es_principal} onChange={() => updateDocumento(index, 'es_principal', true)} className="form-checkbox" />
                    <span className="text-xs font-medium text-gray-600">{doc.es_principal ? 'Principal' : 'Marcar como principal'}</span>
                  </label>
                  {documentos.length > 1 && (
                    <button type="button" onClick={() => removeDocumento(index)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className={`${lbl} text-xs`}>Tipo</label>
                    <select value={doc.tipo} onChange={e => updateDocumento(index, 'tipo', e.target.value)} className={`${inp} text-sm`}>
                      <option value="DNI">DNI</option>
                      <option value="NIE">NIE</option>
                      <option value="NIF">NIF</option>
                      <option value="Pasaporte">Pasaporte</option>
                      <option value="CIF">CIF</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className={`${lbl} text-xs`}>Número *</label>
                    <input type="text" value={doc.numero} onChange={e => updateDocumento(index, 'numero', e.target.value)} className={`${inp} text-sm`} placeholder="12345678A" />
                  </div>
                  <div>
                    <label className={`${lbl} text-xs`}>Expedición</label>
                    <input type="date" value={doc.fecha_expedicion} onChange={e => updateDocumento(index, 'fecha_expedicion', e.target.value)} className={`${inp} text-sm`} />
                  </div>
                  <div>
                    <label className={`${lbl} text-xs`}>Caducidad</label>
                    <input type="date" value={doc.fecha_caducidad} onChange={e => updateDocumento(index, 'fecha_caducidad', e.target.value)} className={`${inp} text-sm`} />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addDocumento} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800">
              <Plus className="w-3.5 h-3.5" /> Añadir otro documento
            </button>
          </div>
        )}
      </fieldset>

      {/* ═══ REPRESENTANTE (APODERADO) ═══ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Datos del representante (apoderado)" icon={<FileSignature className="w-4 h-4 text-gray-500" />} section="representante" />
        {expandedSections.representante && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-500"><User className="w-3.5 h-3.5" /> Sincronizado en todos tus dispositivos</div>
              <button type="button" onClick={async () => { await saveRepte(repte); setSavedRepMsg(true); setTimeout(() => setSavedRepMsg(false), 2000); }} className="btn btn-secondary btn-sm flex items-center gap-1">
                <Save className="w-3 h-3" /> {savedRepMsg ? '✓ Guardado' : savingRepte ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className={lbl}>DNI/NIF/NIE</label><input className={inp} value={repte.dni_nie} onChange={e => setT('dni_nie', e.target.value)} /></div>
              <div className="md:col-span-2"><label className={lbl}>Razón Social</label><input className={inp} value={repte.razon_social} onChange={e => setT('razon_social', e.target.value)} /></div>
              <div><label className={lbl}>Nombre</label><input className={inp} value={repte.nombre} onChange={e => setT('nombre', e.target.value)} /></div>
              <div><label className={lbl}>1er Apellido</label><input className={inp} value={repte.apellido1} onChange={e => setT('apellido1', e.target.value)} /></div>
              <div><label className={lbl}>2º Apellido</label><input className={inp} value={repte.apellido2} onChange={e => setT('apellido2', e.target.value)} /></div>
              <div className="md:col-span-2"><label className={lbl}>Domicilio</label><input className={inp} value={repte.domicilio} onChange={e => setT('domicilio', e.target.value)} /></div>
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
          </div>
        )}
      </fieldset>

      {/* ═══ DESIGNACIÓN — SOLICITUD + FECHA + GENERACIÓN PDF ═══ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Generar designación de representante" icon={<Printer className="w-4 h-4 text-gray-500" />} section="designacion" />
        {expandedSections.designacion && (
          <div className="mt-3 space-y-4">
            <div>
              <label className={lbl}>Tipo de solicitud / procedimiento</label>
              <input className={inp} value={solicitud} onChange={e => setSolicitud(e.target.value)}
                placeholder="ej: solicitud de autorización de residencia temporal por arraigo social" />
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
                {generatingPdf
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generando…</>
                  : <><Download className="w-4 h-4" /> Descargar PDF designación</>
                }
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
                    {uploadedSignedUrl && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <span className="flex items-center gap-1 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> PDF firmado guardado</span>
                        <a href={uploadedSignedUrl} download="designacion-representante-firmado.pdf" className="btn btn-secondary btn-sm flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5" /> Descargar
                        </a>
                        <button type="button" onClick={() => setUploadedSignedUrl(null)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </fieldset>

      {/* ═══ ESTADO Y NOTAS ═══ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Estado y notas" icon={<User className="w-4 h-4 text-gray-500" />} section="estado" />
        {expandedSections.estado && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className={lbl}>Estado del cliente *</label>
              <select value={formData.estado} onChange={e => set('estado', e.target.value)} className={inp}>
                <option value="activo">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="archivado">Archivado</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Fecha de entrada *</label>
              <input type="date" value={formData.fecha_entrada} onChange={e => set('fecha_entrada', e.target.value)} className={inp} required />
            </div>
            <div className="md:col-span-2">
              <label className={lbl}>Notas</label>
              <textarea value={formData.notas} onChange={e => set('notas', e.target.value)} className={inp} rows={2} placeholder="Observaciones generales sobre el cliente..." />
            </div>
            <div className="md:col-span-2">
              <label className={lbl}>Carpeta local</label>
              <input type="text" value={formData.carpeta_local} onChange={e => set('carpeta_local', e.target.value)} className={inp} placeholder="C:\Clientes\NombreCliente" />
            </div>
          </div>
        )}
      </fieldset>

      {/* ═══ PROCEDIMIENTO DIRECTO (OPCIONAL) ═══ */}
      {allowProcedimiento && !cliente && (
        <fieldset className="form-fieldset">
          <div className="flex items-center justify-between py-2">
            <SectionHeader title="Añadir procedimiento (opcional)" icon={<FileText className="w-4 h-4 text-gray-500" />} section="procedimiento" />
            <label className="flex items-center gap-2 cursor-pointer mr-2">
              <input type="checkbox" checked={addProc} onChange={e => { setAddProc(e.target.checked); if (e.target.checked) setExpandedSections(prev => ({ ...prev, procedimiento: true })); }} className="form-checkbox" />
              <span className="text-xs text-gray-600">Crear</span>
            </label>
          </div>
          {addProc && expandedSections.procedimiento && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
              <div>
                <label className={lbl}>Título *</label>
                <input type="text" value={procForm.titulo} onChange={e => setProcForm({ ...procForm, titulo: e.target.value })} className={inp} placeholder="Ej: Solicitud NIE" required={addProc} />
              </div>
              <div>
                <label className={lbl}>Concepto *</label>
                <input type="text" value={procForm.concepto} onChange={e => setProcForm({ ...procForm, concepto: e.target.value })} className={inp} placeholder="Ej: Tramitación NIE" required={addProc} />
              </div>
              <div>
                <label className={lbl}>Presupuesto *</label>
                <input type="number" step="0.01" min="0" value={procForm.presupuesto} onChange={e => setProcForm({ ...procForm, presupuesto: parseFloat(e.target.value) || 0 })} className={inp} required={addProc} />
              </div>
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
