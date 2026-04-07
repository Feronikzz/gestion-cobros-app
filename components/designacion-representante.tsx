'use client';

import { useState, useRef } from 'react';
import type { Cliente } from '@/lib/supabase/types';
import { Printer } from 'lucide-react';

interface DesignacionFormData {
  // Datos del representado (cliente)
  representado_nombre: string;
  representado_apellidos: string;
  representado_nif: string;
  representado_tipo_doc: string;
  representado_nacionalidad: string;
  representado_domicilio: string;
  representado_localidad: string;
  representado_provincia: string;
  representado_cp: string;
  representado_telefono: string;
  representado_email: string;
  // Datos del representante
  representante_nombre: string;
  representante_apellidos: string;
  representante_nif: string;
  representante_tipo_doc: string;
  representante_domicilio: string;
  representante_localidad: string;
  representante_provincia: string;
  representante_cp: string;
  representante_telefono: string;
  representante_email: string;
  representante_colegiado: string;
  // Datos del procedimiento
  procedimiento_tipo: string;
  procedimiento_descripcion: string;
  organismo: string;
  expediente_referencia: string;
  // Actos autorizados
  actos: string[];
  // Lugar y fecha
  lugar: string;
  fecha: string;
}

interface DesignacionRepresentanteProps {
  cliente?: Cliente;
  onClose?: () => void;
}

const ACTOS_DISPONIBLES = [
  'Presentar escritos, solicitudes y comunicaciones',
  'Recibir notificaciones y comunicaciones',
  'Interponer recursos y reclamaciones',
  'Desistir de acciones y renunciar a derechos',
  'Consultar el expediente y obtener copias',
  'Comparecer ante los órganos administrativos',
  'Firmar cuantos documentos sean necesarios',
  'Cualquier otra actuación que resulte necesaria',
];

export function DesignacionRepresentante({ cliente, onClose }: DesignacionRepresentanteProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<DesignacionFormData>({
    representado_nombre: cliente?.nombre || '',
    representado_apellidos: cliente?.apellidos || '',
    representado_nif: cliente?.nif || '',
    representado_tipo_doc: cliente?.documento_tipo || 'NIE',
    representado_nacionalidad: cliente?.nacionalidad || '',
    representado_domicilio: cliente?.direccion || '',
    representado_localidad: cliente?.localidad || '',
    representado_provincia: cliente?.provincia || '',
    representado_cp: cliente?.codigo_postal || '',
    representado_telefono: cliente?.telefono || '',
    representado_email: cliente?.email || '',
    representante_nombre: '',
    representante_apellidos: '',
    representante_nif: '',
    representante_tipo_doc: 'DNI',
    representante_domicilio: '',
    representante_localidad: '',
    representante_provincia: '',
    representante_cp: '',
    representante_telefono: '',
    representante_email: '',
    representante_colegiado: '',
    procedimiento_tipo: 'Extranjería',
    procedimiento_descripcion: '',
    organismo: '',
    expediente_referencia: '',
    actos: [...ACTOS_DISPONIBLES],
    lugar: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  const [showPreview, setShowPreview] = useState(false);

  const set = (key: keyof DesignacionFormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleActo = (acto: string) => {
    setForm(prev => ({
      ...prev,
      actos: prev.actos.includes(acto)
        ? prev.actos.filter(a => a !== acto)
        : [...prev.actos, acto],
    }));
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Designación de Representante</title>
      <style>
        @page { size: A4; margin: 25mm 20mm; }
        body { font-family: 'Times New Roman', Times, serif; color: #000; margin: 0; padding: 0; font-size: 12pt; line-height: 1.6; }
        .doc-container { max-width: 170mm; margin: 0 auto; }
        h1 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24pt; border-bottom: 1px solid #000; padding-bottom: 8pt; }
        h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 18pt 0 8pt 0; }
        .section { margin-bottom: 12pt; }
        .field-row { margin-bottom: 4pt; }
        .field-label { font-weight: bold; }
        .field-value { }
        .legal-text { text-align: justify; margin: 12pt 0; }
        .actos-list { margin: 8pt 0 8pt 20pt; }
        .actos-list li { margin-bottom: 3pt; }
        .firma-section { margin-top: 40pt; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .firma-box { width: 45%; text-align: center; }
        .firma-line { border-top: 1px solid #000; margin-top: 70pt; padding-top: 6pt; font-size: 10pt; }
        .firma-caption { font-size: 9pt; color: #555; margin-top: 2pt; }
        .date-place { text-align: right; margin: 24pt 0; font-style: italic; }
        .nota-legal { margin-top: 24pt; padding: 8pt; border: 1px solid #ccc; font-size: 9pt; color: #555; }
        .checkbox { display: inline-block; width: 10pt; height: 10pt; border: 1pt solid #000; margin-right: 4pt; vertical-align: middle; }
        .checkbox.checked { background: #000; }
      </style>
      </head><body>
        ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const nombreCompletoRepresentado = [form.representado_nombre, form.representado_apellidos].filter(Boolean).join(' ');
  const nombreCompletoRepresentante = [form.representante_nombre, form.representante_apellidos].filter(Boolean).join(' ');
  const fechaFormateada = new Date(form.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
      {!showPreview ? (
        /* ═══════ FORMULARIO ═══════ */
        <div className="form-grid">
          {/* Representado */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Datos del representado (Poderdante)</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nombre *</label>
                <input type="text" value={form.representado_nombre} onChange={e => set('representado_nombre', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Apellidos</label>
                <input type="text" value={form.representado_apellidos} onChange={e => set('representado_apellidos', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Tipo documento</label>
                <select value={form.representado_tipo_doc} onChange={e => set('representado_tipo_doc', e.target.value)} className="form-input">
                  <option value="DNI">DNI</option>
                  <option value="NIE">NIE</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="form-label">Nº documento *</label>
                <input type="text" value={form.representado_nif} onChange={e => set('representado_nif', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Nacionalidad</label>
                <input type="text" value={form.representado_nacionalidad} onChange={e => set('representado_nacionalidad', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input type="tel" value={form.representado_telefono} onChange={e => set('representado_telefono', e.target.value)} className="form-input" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Domicilio</label>
                <input type="text" value={form.representado_domicilio} onChange={e => set('representado_domicilio', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Localidad</label>
                <input type="text" value={form.representado_localidad} onChange={e => set('representado_localidad', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Provincia</label>
                <input type="text" value={form.representado_provincia} onChange={e => set('representado_provincia', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">C.P.</label>
                <input type="text" value={form.representado_cp} onChange={e => set('representado_cp', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input type="email" value={form.representado_email} onChange={e => set('representado_email', e.target.value)} className="form-input" />
              </div>
            </div>
          </fieldset>

          {/* Representante */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Datos del representante (Apoderado)</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nombre *</label>
                <input type="text" value={form.representante_nombre} onChange={e => set('representante_nombre', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Apellidos</label>
                <input type="text" value={form.representante_apellidos} onChange={e => set('representante_apellidos', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Tipo documento</label>
                <select value={form.representante_tipo_doc} onChange={e => set('representante_tipo_doc', e.target.value)} className="form-input">
                  <option value="DNI">DNI</option>
                  <option value="NIE">NIE</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="form-label">Nº documento *</label>
                <input type="text" value={form.representante_nif} onChange={e => set('representante_nif', e.target.value)} className="form-input" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Domicilio</label>
                <input type="text" value={form.representante_domicilio} onChange={e => set('representante_domicilio', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Localidad</label>
                <input type="text" value={form.representante_localidad} onChange={e => set('representante_localidad', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Provincia</label>
                <input type="text" value={form.representante_provincia} onChange={e => set('representante_provincia', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">C.P.</label>
                <input type="text" value={form.representante_cp} onChange={e => set('representante_cp', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input type="tel" value={form.representante_telefono} onChange={e => set('representante_telefono', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input type="email" value={form.representante_email} onChange={e => set('representante_email', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Nº colegiado (si aplica)</label>
                <input type="text" value={form.representante_colegiado} onChange={e => set('representante_colegiado', e.target.value)} className="form-input" />
              </div>
            </div>
          </fieldset>

          {/* Procedimiento */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Datos del procedimiento</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Tipo de procedimiento</label>
                <input type="text" value={form.procedimiento_tipo} onChange={e => set('procedimiento_tipo', e.target.value)} className="form-input" placeholder="Extranjería, Administrativo..." />
              </div>
              <div>
                <label className="form-label">Organismo</label>
                <input type="text" value={form.organismo} onChange={e => set('organismo', e.target.value)} className="form-input" placeholder="Oficina de Extranjería de..." />
              </div>
              <div>
                <label className="form-label">Nº expediente / referencia</label>
                <input type="text" value={form.expediente_referencia} onChange={e => set('expediente_referencia', e.target.value)} className="form-input" />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Descripción del procedimiento</label>
                <textarea value={form.procedimiento_descripcion} onChange={e => set('procedimiento_descripcion', e.target.value)} className="form-input" rows={2} placeholder="Solicitud de autorización de residencia temporal por arraigo social..." />
              </div>
            </div>
          </fieldset>

          {/* Actos autorizados */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Actos autorizados</legend>
            <div className="space-y-2 mt-2">
              {ACTOS_DISPONIBLES.map(acto => (
                <label key={acto} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.actos.includes(acto)} onChange={() => toggleActo(acto)} className="form-checkbox mt-0.5" />
                  <span className="text-sm text-gray-700">{acto}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Lugar y fecha */}
          <fieldset className="form-fieldset">
            <legend className="form-legend">Lugar y fecha</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Lugar</label>
                <input type="text" value={form.lugar} onChange={e => set('lugar', e.target.value)} className="form-input" placeholder="Madrid" />
              </div>
              <div>
                <label className="form-label">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className="form-input" />
              </div>
            </div>
          </fieldset>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-white py-3 border-t border-gray-200">
            {onClose && (
              <button type="button" onClick={onClose} className="btn btn-secondary">Cerrar</button>
            )}
            <button type="button" onClick={() => setShowPreview(true)} className="btn btn-primary">
              Vista previa y generar
            </button>
          </div>
        </div>
      ) : (
        /* ═══════ VISTA PREVIA ═══════ */
        <div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowPreview(false)} className="btn btn-secondary btn-sm">← Editar datos</button>
            <button onClick={handlePrint} className="btn btn-primary btn-sm flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimir / Descargar PDF
            </button>
          </div>

          <div ref={printRef}>
            <div className="doc-container" style={{ maxWidth: '700px', margin: '0 auto', fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt', lineHeight: 1.6, color: '#000' }}>
              <h1 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '24pt', borderBottom: '1px solid #000', paddingBottom: '8pt' }}>
                DESIGNACIÓN DE REPRESENTANTE
              </h1>

              {/* Datos representado */}
              <div style={{ marginBottom: '16pt' }}>
                <h2 style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' as const, marginBottom: '8pt' }}>DATOS DEL INTERESADO / REPRESENTADO</h2>
                <div style={{ marginBottom: '4pt' }}><strong>Nombre y apellidos:</strong> {nombreCompletoRepresentado}</div>
                <div style={{ marginBottom: '4pt' }}><strong>{form.representado_tipo_doc}:</strong> {form.representado_nif}</div>
                {form.representado_nacionalidad && <div style={{ marginBottom: '4pt' }}><strong>Nacionalidad:</strong> {form.representado_nacionalidad}</div>}
                <div style={{ marginBottom: '4pt' }}><strong>Domicilio:</strong> {form.representado_domicilio}{form.representado_cp ? `, C.P. ${form.representado_cp}` : ''}{form.representado_localidad ? `, ${form.representado_localidad}` : ''}{form.representado_provincia ? ` (${form.representado_provincia})` : ''}</div>
                {form.representado_telefono && <div style={{ marginBottom: '4pt' }}><strong>Teléfono:</strong> {form.representado_telefono}</div>}
                {form.representado_email && <div style={{ marginBottom: '4pt' }}><strong>Email:</strong> {form.representado_email}</div>}
              </div>

              {/* Datos representante */}
              <div style={{ marginBottom: '16pt' }}>
                <h2 style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' as const, marginBottom: '8pt' }}>DATOS DEL REPRESENTANTE / APODERADO</h2>
                <div style={{ marginBottom: '4pt' }}><strong>Nombre y apellidos:</strong> {nombreCompletoRepresentante}</div>
                <div style={{ marginBottom: '4pt' }}><strong>{form.representante_tipo_doc}:</strong> {form.representante_nif}</div>
                <div style={{ marginBottom: '4pt' }}><strong>Domicilio:</strong> {form.representante_domicilio}{form.representante_cp ? `, C.P. ${form.representante_cp}` : ''}{form.representante_localidad ? `, ${form.representante_localidad}` : ''}{form.representante_provincia ? ` (${form.representante_provincia})` : ''}</div>
                {form.representante_telefono && <div style={{ marginBottom: '4pt' }}><strong>Teléfono:</strong> {form.representante_telefono}</div>}
                {form.representante_email && <div style={{ marginBottom: '4pt' }}><strong>Email:</strong> {form.representante_email}</div>}
                {form.representante_colegiado && <div style={{ marginBottom: '4pt' }}><strong>Nº colegiado:</strong> {form.representante_colegiado}</div>}
              </div>

              {/* Texto legal */}
              <div style={{ textAlign: 'justify', margin: '16pt 0' }}>
                <p>
                  D./Dña. <strong>{nombreCompletoRepresentado}</strong>, mayor de edad, con {form.representado_tipo_doc} número <strong>{form.representado_nif}</strong>
                  {form.representado_nacionalidad ? `, de nacionalidad ${form.representado_nacionalidad}` : ''}
                  , y domicilio a efectos de notificaciones en {form.representado_domicilio}
                  {form.representado_localidad ? `, ${form.representado_localidad}` : ''}
                  {form.representado_provincia ? ` (${form.representado_provincia})` : ''}
                  , por medio del presente documento,
                </p>
                <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13pt', margin: '16pt 0' }}>DESIGNA</p>
                <p>
                  como su representante a D./Dña. <strong>{nombreCompletoRepresentante}</strong>, mayor de edad, con {form.representante_tipo_doc} número <strong>{form.representante_nif}</strong>
                  , y domicilio en {form.representante_domicilio}
                  {form.representante_localidad ? `, ${form.representante_localidad}` : ''}
                  {form.representante_provincia ? ` (${form.representante_provincia})` : ''}
                  {form.representante_colegiado ? `, colegiado nº ${form.representante_colegiado}` : ''}
                  , para que en su nombre y representación realice cuantas actuaciones sean necesarias en relación con el siguiente procedimiento:
                </p>
              </div>

              {/* Procedimiento */}
              {(form.procedimiento_tipo || form.procedimiento_descripcion || form.organismo) && (
                <div style={{ margin: '12pt 0', padding: '8pt 12pt', border: '1px solid #ccc' }}>
                  {form.procedimiento_tipo && <div style={{ marginBottom: '4pt' }}><strong>Tipo:</strong> {form.procedimiento_tipo}</div>}
                  {form.procedimiento_descripcion && <div style={{ marginBottom: '4pt' }}><strong>Descripción:</strong> {form.procedimiento_descripcion}</div>}
                  {form.organismo && <div style={{ marginBottom: '4pt' }}><strong>Organismo:</strong> {form.organismo}</div>}
                  {form.expediente_referencia && <div><strong>Expediente / Referencia:</strong> {form.expediente_referencia}</div>}
                </div>
              )}

              {/* Actos autorizados */}
              <div style={{ margin: '12pt 0' }}>
                <p>La presente designación comprende, sin carácter limitativo, las siguientes facultades:</p>
                <ul style={{ margin: '8pt 0 8pt 20pt' }}>
                  {form.actos.map((acto, i) => (
                    <li key={i} style={{ marginBottom: '3pt' }}>{acto}</li>
                  ))}
                </ul>
              </div>

              <div style={{ textAlign: 'justify', margin: '12pt 0' }}>
                <p>
                  La presente designación de representante se otorga de conformidad con lo dispuesto en el artículo 5 de la Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas, y tendrá validez mientras no sea expresamente revocada.
                </p>
              </div>

              {/* Lugar y fecha */}
              <div style={{ textAlign: 'right', margin: '24pt 0', fontStyle: 'italic' }}>
                En {form.lugar || '____________'}, a {fechaFormateada}
              </div>

              {/* Firmas */}
              <div style={{ marginTop: '40pt', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '45%', textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', marginTop: '70pt', paddingTop: '6pt', fontSize: '10pt' }}>
                    EL/LA REPRESENTADO/A
                  </div>
                  <div style={{ fontSize: '9pt', color: '#555', marginTop: '2pt' }}>
                    {nombreCompletoRepresentado}
                  </div>
                </div>
                <div style={{ width: '45%', textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', marginTop: '70pt', paddingTop: '6pt', fontSize: '10pt' }}>
                    EL/LA REPRESENTANTE
                  </div>
                  <div style={{ fontSize: '9pt', color: '#555', marginTop: '2pt' }}>
                    {nombreCompletoRepresentante}
                  </div>
                </div>
              </div>

              {/* Nota legal */}
              <div style={{ marginTop: '30pt', padding: '8pt', border: '1px solid #ccc', fontSize: '9pt', color: '#555' }}>
                <strong>NOTA:</strong> De conformidad con el artículo 5 de la Ley 39/2015, de 1 de octubre, los interesados con capacidad de obrar podrán actuar por medio de representante, entendiéndose con éste las actuaciones administrativas, salvo manifestación expresa en contra del interesado. La representación podrá acreditarse por cualquier medio válido en Derecho que deje constancia fidedigna de su existencia.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
