'use client';

import { useState } from 'react';
import type { Cliente, ClienteInsert, EstadoProcedimiento } from '@/lib/supabase/types';
import { formatField } from '@/lib/utils/text';
import { User, FileText, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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

export function ClienteFormV2({ cliente, onSubmit, onCancel, initialDocs, allowProcedimiento = true }: ClienteFormV2Props) {
  // ─── Datos personales ───
  const [formData, setFormData] = useState({
    nombre: cliente?.nombre ?? '',
    apellidos: cliente?.apellidos ?? '',
    telefono: cliente?.telefono ?? '',
    telefono2: cliente?.telefono2 ?? '',
    email: cliente?.email ?? '',
    direccion: cliente?.direccion ?? '',
    codigo_postal: cliente?.codigo_postal ?? '',
    localidad: cliente?.localidad ?? '',
    provincia: cliente?.provincia ?? '',
    fecha_nacimiento: cliente?.fecha_nacimiento ?? (cliente?.anio_nacimiento ? `${cliente.anio_nacimiento}-01-01` : ''),
    nacionalidad: cliente?.nacionalidad ?? '',
    fecha_entrada: cliente?.fecha_entrada ?? new Date().toISOString().split('T')[0],
    estado: cliente?.estado ?? ('activo' as Cliente['estado']),
    notas: cliente?.notas ?? '',
    // Campos legacy de documento principal (se usarán del primer doc)
    documento_tipo: cliente?.documento_tipo ?? '',
    documento_numero: cliente?.documento_numero ?? '',
    documento_caducidad: cliente?.documento_caducidad ?? '',
  });

  // ─── Documentos de identidad ───
  const [documentos, setDocumentos] = useState<DocIdentidadForm[]>(
    initialDocs && initialDocs.length > 0
      ? initialDocs
      : [{ ...emptyDoc, es_principal: true }]
  );

  // ─── Procedimiento opcional ───
  const [addProc, setAddProc] = useState(false);
  const [procForm, setProcForm] = useState<ProcedimientoForm>({ ...emptyProc });

  // ─── Secciones colapsables ───
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contacto: true,
    documentos: true,
    estado: true,
    procedimiento: false,
  });

  const [loading, setLoading] = useState(false);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const set = (key: string, value: string) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  // ─── Documentos helpers ───
  const addDocumento = () => {
    setDocumentos(prev => [...prev, { ...emptyDoc }]);
  };

  const removeDocumento = (index: number) => {
    setDocumentos(prev => {
      const next = prev.filter((_, i) => i !== index);
      // Si eliminamos el principal, hacer el primero principal
      if (prev[index].es_principal && next.length > 0) {
        next[0].es_principal = true;
      }
      return next;
    });
  };

  const updateDocumento = (index: number, field: keyof DocIdentidadForm, value: string | boolean) => {
    setDocumentos(prev => {
      const next = [...prev];
      if (field === 'es_principal' && value === true) {
        // Solo uno puede ser principal
        next.forEach((d, i) => { d.es_principal = i === index; });
      } else {
        (next[index] as any)[field] = value;
      }
      return next;
    });
  };

  // ─── Submit ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Sincronizar doc principal con campos legacy del cliente
      const docPrincipal = documentos.find(d => d.es_principal) || documentos[0];

      const clienteData: Omit<ClienteInsert, 'user_id'> = {
        nombre: formatField(formData.nombre, 'name'),
        apellidos: formData.apellidos ? formatField(formData.apellidos, 'name') : null,
        nif: docPrincipal?.numero ? formatField(docPrincipal.numero, 'nif') : (formData.documento_numero || null),
        telefono: formData.telefono ? formatField(formData.telefono, 'phone') : null,
        telefono2: formData.telefono2 ? formatField(formData.telefono2, 'phone') : null,
        email: formData.email ? formatField(formData.email, 'email') : null,
        direccion: formData.direccion ? formatField(formData.direccion, 'address') : null,
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
        notas: formData.notas ? formatField(formData.notas, 'general') : null,
      };

      const procData = addProc && procForm.titulo ? procForm : null;
      await onSubmit(clienteData, documentos.filter(d => d.numero), procData);
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

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

      {/* ════════════════ DATOS PERSONALES ════════════════ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Datos personales" icon={<User className="w-4 h-4 text-gray-500" />} section="personal" />
        {expandedSections.personal && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="form-label">Nombre *</label>
              <input type="text" value={formData.nombre} onChange={e => set('nombre', e.target.value)} className="form-input" required placeholder="Nombre" />
            </div>
            <div>
              <label className="form-label">Apellidos</label>
              <input type="text" value={formData.apellidos} onChange={e => set('apellidos', e.target.value)} className="form-input" placeholder="Apellido1 Apellido2" />
            </div>
            <div>
              <label className="form-label">Fecha de nacimiento</label>
              <input type="date" value={formData.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} className="form-input" />
              <p className="text-xs text-gray-400 mt-1">Si solo conoces el año, usa 01/01 como día y mes</p>
            </div>
            <div>
              <label className="form-label">Nacionalidad</label>
              <input type="text" value={formData.nacionalidad} onChange={e => set('nacionalidad', e.target.value)} className="form-input" placeholder="Española" />
            </div>
          </div>
        )}
      </fieldset>

      {/* ════════════════ CONTACTO ════════════════ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Datos de contacto" icon={<User className="w-4 h-4 text-gray-500" />} section="contacto" />
        {expandedSections.contacto && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="form-label">Teléfono / Móvil</label>
              <input type="tel" value={formData.telefono} onChange={e => set('telefono', e.target.value)} className="form-input" placeholder="600 000 000" />
            </div>
            <div>
              <label className="form-label">Segundo teléfono</label>
              <input type="tel" value={formData.telefono2} onChange={e => set('telefono2', e.target.value)} className="form-input" placeholder="912 345 678" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Email</label>
              <input type="email" value={formData.email} onChange={e => set('email', e.target.value)} className="form-input" placeholder="correo@ejemplo.com" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Dirección</label>
              <input type="text" value={formData.direccion} onChange={e => set('direccion', e.target.value)} className="form-input" placeholder="Calle, número, piso..." />
            </div>
            <div>
              <label className="form-label">Código postal</label>
              <input type="text" value={formData.codigo_postal} onChange={e => set('codigo_postal', e.target.value)} className="form-input" placeholder="28001" maxLength={5} />
            </div>
            <div>
              <label className="form-label">Localidad</label>
              <input type="text" value={formData.localidad} onChange={e => set('localidad', e.target.value)} className="form-input" placeholder="Madrid" />
            </div>
            <div>
              <label className="form-label">Provincia</label>
              <input type="text" value={formData.provincia} onChange={e => set('provincia', e.target.value)} className="form-input" placeholder="Madrid" />
            </div>
          </div>
        )}
      </fieldset>

      {/* ════════════════ DOCUMENTOS DE IDENTIDAD ════════════════ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Documentos de identidad" icon={<FileText className="w-4 h-4 text-gray-500" />} section="documentos" />
        {expandedSections.documentos && (
          <div className="mt-3 space-y-4">
            {documentos.map((doc, index) => (
              <div key={index} className={`p-3 rounded-lg border ${doc.es_principal ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="doc_principal"
                        checked={doc.es_principal}
                        onChange={() => updateDocumento(index, 'es_principal', true)}
                        className="form-checkbox"
                      />
                      <span className="text-xs font-medium text-gray-600">
                        {doc.es_principal ? 'Principal' : 'Marcar como principal'}
                      </span>
                    </label>
                  </div>
                  {documentos.length > 1 && (
                    <button type="button" onClick={() => removeDocumento(index)} className="p-1 text-red-500 hover:text-red-700 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="form-label text-xs">Tipo</label>
                    <select value={doc.tipo} onChange={e => updateDocumento(index, 'tipo', e.target.value)} className="form-input text-sm">
                      <option value="DNI">DNI</option>
                      <option value="NIE">NIE</option>
                      <option value="NIF">NIF</option>
                      <option value="Pasaporte">Pasaporte</option>
                      <option value="CIF">CIF</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">Número *</label>
                    <input type="text" value={doc.numero} onChange={e => updateDocumento(index, 'numero', e.target.value)} className="form-input text-sm" placeholder="12345678A" />
                  </div>
                  <div>
                    <label className="form-label text-xs">Fecha expedición</label>
                    <input type="date" value={doc.fecha_expedicion} onChange={e => updateDocumento(index, 'fecha_expedicion', e.target.value)} className="form-input text-sm" />
                  </div>
                  <div>
                    <label className="form-label text-xs">Fecha caducidad</label>
                    <input type="date" value={doc.fecha_caducidad} onChange={e => updateDocumento(index, 'fecha_caducidad', e.target.value)} className="form-input text-sm" />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addDocumento} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Añadir otro documento
            </button>
          </div>
        )}
      </fieldset>

      {/* ════════════════ ESTADO Y NOTAS ════════════════ */}
      <fieldset className="form-fieldset">
        <SectionHeader title="Estado y notas" icon={<User className="w-4 h-4 text-gray-500" />} section="estado" />
        {expandedSections.estado && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="form-label">Estado del cliente *</label>
              <select value={formData.estado} onChange={e => set('estado', e.target.value)} className="form-input">
                <option value="activo">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="archivado">Archivado</option>
              </select>
            </div>
            <div>
              <label className="form-label">Fecha de entrada *</label>
              <input type="date" value={formData.fecha_entrada} onChange={e => set('fecha_entrada', e.target.value)} className="form-input" required />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Notas</label>
              <textarea value={formData.notas} onChange={e => set('notas', e.target.value)} className="form-input" rows={2} placeholder="Observaciones generales sobre el cliente..." />
            </div>
          </div>
        )}
      </fieldset>

      {/* ════════════════ PROCEDIMIENTO DIRECTO (OPCIONAL) ════════════════ */}
      {allowProcedimiento && !cliente && (
        <fieldset className="form-fieldset">
          <div className="flex items-center justify-between py-2">
            <SectionHeader title="Añadir procedimiento (opcional)" icon={<FileText className="w-4 h-4 text-gray-500" />} section="procedimiento" />
            <label className="flex items-center gap-2 cursor-pointer mr-2">
              <input
                type="checkbox"
                checked={addProc}
                onChange={e => {
                  setAddProc(e.target.checked);
                  if (e.target.checked) {
                    setExpandedSections(prev => ({ ...prev, procedimiento: true }));
                  }
                }}
                className="form-checkbox"
              />
              <span className="text-xs text-gray-600">Crear</span>
            </label>
          </div>
          {addProc && expandedSections.procedimiento && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
              <div>
                <label className="form-label">Título del procedimiento *</label>
                <input type="text" value={procForm.titulo} onChange={e => setProcForm({ ...procForm, titulo: e.target.value })} className="form-input" placeholder="Ej: Solicitud NIE" required={addProc} />
              </div>
              <div>
                <label className="form-label">Concepto *</label>
                <input type="text" value={procForm.concepto} onChange={e => setProcForm({ ...procForm, concepto: e.target.value })} className="form-input" placeholder="Ej: Tramitación NIE por arraigo" required={addProc} />
              </div>
              <div>
                <label className="form-label">Presupuesto *</label>
                <input type="number" step="0.01" min="0" value={procForm.presupuesto} onChange={e => setProcForm({ ...procForm, presupuesto: parseFloat(e.target.value) || 0 })} className="form-input" required={addProc} />
              </div>
              <div>
                <label className="form-label">Estado inicial</label>
                <select value={procForm.estado} onChange={e => setProcForm({ ...procForm, estado: e.target.value as EstadoProcedimiento })} className="form-input">
                  <option value="pendiente_presentar">Pte. presentar</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={procForm.tiene_entrada} onChange={e => setProcForm({ ...procForm, tiene_entrada: e.target.checked })} className="form-checkbox" />
                  <span className="form-label" style={{ margin: 0 }}>¿Paga entrada?</span>
                </label>
                {procForm.tiene_entrada && (
                  <div className="flex items-center gap-2">
                    <label className="form-label text-xs" style={{ margin: 0 }}>Importe:</label>
                    <input type="number" step="0.01" min="0" value={procForm.importe_entrada || ''} onChange={e => setProcForm({ ...procForm, importe_entrada: parseFloat(e.target.value) || 0 })} className="form-input" style={{ width: '120px' }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </fieldset>
      )}

      {/* ════════════════ ACCIONES ════════════════ */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 mt-2 sticky bottom-0 bg-white py-3">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : cliente ? 'Actualizar cliente' : addProc ? 'Crear cliente y procedimiento' : 'Crear cliente'}
        </button>
      </div>
    </form>
  );
}
