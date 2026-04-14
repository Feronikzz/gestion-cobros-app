'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Procedimiento, EstadoProcedimiento, CategoriaProcedimiento, DocumentoRequerido } from '@/lib/supabase/types';
import { formatField } from '@/lib/utils/text';
import { 
  getCatalogoCompleto, 
  getAllCategoriaLabels, 
  getDocumentosRequeridos, 
  getCategoriaByTitulo,
  addProcedimientoCatalogo,
  invalidateCache,
  type ProcedimientoCatalogo,
  CATEGORIA_LABELS
} from '@/lib/catalogo-procedimientos';
import { Search, CheckSquare, Square, Plus, X, FileText } from 'lucide-react';

interface ProcedimientoFormProps {
  procedimiento?: Procedimiento;
  clienteId: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const estadoProcLabel: Record<EstadoProcedimiento, string> = {
  pendiente: 'Pendiente',
  pendiente_presentar: 'Pte. presentar',
  en_proceso: 'En proceso',
  presentado: 'Presentado',
  pendiente_resolucion: 'Pte. resolución',
  pendiente_recurso: 'Pte. recurso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  archivado: 'Archivado',
};

// Campos que solo tienen sentido una vez presentado el procedimiento
const CAMPOS_POST_PRESENTACION: EstadoProcedimiento[] = [
  'en_proceso', 'presentado', 'pendiente_resolucion', 'pendiente_recurso', 'resuelto', 'cerrado', 'archivado'
];

export function ProcedimientoForm({ procedimiento, clienteId, onSubmit, onCancel }: ProcedimientoFormProps) {
  const isEditing = !!procedimiento;

  const [form, setForm] = useState({
    titulo: procedimiento?.titulo || '',
    concepto: procedimiento?.concepto || '',
    categoria: (procedimiento?.categoria || '') as CategoriaProcedimiento | '',
    presupuesto: procedimiento?.presupuesto || 0,
    tiene_entrada: procedimiento?.tiene_entrada || false,
    importe_entrada: procedimiento?.importe_entrada || 0,
    nie_interesado: procedimiento?.nie_interesado || '',
    nombre_interesado: procedimiento?.nombre_interesado || '',
    expediente_referencia: procedimiento?.expediente_referencia || '',
    fecha_presentacion: procedimiento?.fecha_presentacion || '',
    fecha_resolucion: procedimiento?.fecha_resolucion || '',
    estado: procedimiento?.estado || 'pendiente_presentar' as EstadoProcedimiento,
    notas: procedimiento?.notas || '',
  });

  // Document checklist state
  const [docsRequeridos, setDocsRequeridos] = useState<DocumentoRequerido[]>(
    procedimiento?.documentos_requeridos || []
  );
  const [nuevoDocNombre, setNuevoDocNombre] = useState('');

  // Title search state
  const [tituloSearch, setTituloSearch] = useState(form.titulo);
  const [showTituloDropdown, setShowTituloDropdown] = useState(false);
  const tituloRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tituloRef.current && !tituloRef.current.contains(e.target as Node)) {
        setShowTituloDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Catálogo completo - ahora async desde Supabase
  const [catalogoCompleto, setCatalogoCompleto] = useState<ProcedimientoCatalogo[]>([]);
  const [categoriaLabels, setCategoriaLabels] = useState<Record<string, string>>(CATEGORIA_LABELS);
  const [catalogoLoading, setCatalogoLoading] = useState(true);
  
  useEffect(() => {
    const loadCatalogo = async () => {
      setCatalogoLoading(true);
      try {
        const [catalogo, labels] = await Promise.all([
          getCatalogoCompleto(),
          getAllCategoriaLabels()
        ]);
        setCatalogoCompleto(catalogo);
        setCategoriaLabels(labels);
      } catch (err) {
        console.error('Error cargando catálogo:', err);
      } finally {
        setCatalogoLoading(false);
      }
    };
    loadCatalogo();
  }, []);

  // Filtered catalog suggestions
  const catalogSuggestions = useMemo(() => {
    const search = tituloSearch.toLowerCase();
    const catFilter = form.categoria || undefined;
    return catalogoCompleto.filter(p => {
      const matchSearch = !search || p.titulo.toLowerCase().includes(search);
      const matchCat = !catFilter || p.categoria === catFilter;
      return matchSearch && matchCat;
    });
  }, [tituloSearch, form.categoria, catalogoCompleto]);

  // Estado para docs por defecto del título seleccionado
  const [docsPorDefecto, setDocsPorDefecto] = useState<DocumentoRequerido[]>([]);
  
  // Cargar docs por defecto cuando cambia el título
  useEffect(() => {
    const loadDocs = async () => {
      if (form.titulo) {
        const docs = await getDocumentosRequeridos(form.titulo);
        setDocsPorDefecto(docs);
      } else {
        setDocsPorDefecto([]);
      }
    };
    loadDocs();
  }, [form.titulo]);

  // Select a catalog procedure (async)
  const selectCatalogProc = async (titulo: string, categoriaForzada?: CategoriaProcedimiento) => {
    setTituloSearch(titulo);
    setShowTituloDropdown(false);
    
    // Get catalog data (async)
    const docsFromCatalog = await getDocumentosRequeridos(titulo);
    const categoriaDetectada = categoriaForzada || await getCategoriaByTitulo(titulo);
    
    setForm(prev => ({
      ...prev,
      titulo,
      // Solo asignar categoría si no hay una manual seleccionada o si se fuerza
      categoria: (categoriaForzada || (!prev.categoria && categoriaDetectada)) ? (categoriaForzada || categoriaDetectada || 'otro') : prev.categoria,
    }));
    
    // Merge docs: mantener docs existentes del procedimiento, añadir nuevos del catálogo
    if (docsFromCatalog.length > 0) {
      setDocsRequeridos(prev => {
        const existentes = new Set(prev.map(d => d.nombre));
        const nuevos = docsFromCatalog.filter(d => !existentes.has(d.nombre));
        return [...prev, ...nuevos];
      });
    }
  };

  // Add custom document
  const addDoc = () => {
    if (!nuevoDocNombre.trim()) return;
    setDocsRequeridos(prev => [...prev, { nombre: nuevoDocNombre.trim(), adjuntado: false, notas: null }]);
    setNuevoDocNombre('');
  };

  const toggleDoc = (idx: number) => {
    setDocsRequeridos(prev => prev.map((d, i) => i === idx ? { ...d, adjuntado: !d.adjuntado } : d));
  };

  const removeDoc = (idx: number) => {
    setDocsRequeridos(prev => prev.filter((_, i) => i !== idx));
  };

  // ¿Mostrar campos de post-presentación?
  const showPostPresentacion = isEditing && CAMPOS_POST_PRESENTACION.includes(form.estado);
  // ¿Mostrar campo de referencia expediente? Solo si ya está presentado o editando
  const showExpedienteRef = isEditing || form.estado !== 'pendiente_presentar';
  // ¿Mostrar resolución? Solo si estado es pendiente_resolucion o posterior
  const showResolucion = isEditing && ['pendiente_resolucion', 'pendiente_recurso', 'resuelto', 'cerrado', 'archivado'].includes(form.estado);

  // Estados disponibles según si es creación o edición
  const estadosDisponibles: EstadoProcedimiento[] = isEditing
    ? ['pendiente', 'pendiente_presentar', 'en_proceso', 'presentado', 'pendiente_resolucion', 'pendiente_recurso', 'resuelto', 'cerrado', 'archivado']
    : ['pendiente', 'pendiente_presentar'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        titulo: formatField(form.titulo || tituloSearch, 'general'),
        concepto: formatField(form.concepto, 'general'),
        categoria: form.categoria || null,
        nie_interesado: form.nie_interesado ? formatField(form.nie_interesado, 'nif') : null,
        nombre_interesado: form.nombre_interesado ? formatField(form.nombre_interesado, 'name') : null,
        expediente_referencia: form.expediente_referencia || null,
        fecha_presentacion: form.fecha_presentacion || null,
        fecha_resolucion: form.fecha_resolucion || null,
        notas: form.notas ? formatField(form.notas, 'general') : null,
        documentos_requeridos: docsRequeridos.length > 0 ? docsRequeridos : null,
        cliente_id: clienteId,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Completion stats
  const docsTotal = docsRequeridos.length;
  const docsAdjuntados = docsRequeridos.filter(d => d.adjuntado).length;

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {/* ── Datos básicos (siempre visibles) ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Datos del procedimiento</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Categoría */}
          <div>
            <label className="form-label">Categoría</label>
            <select
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value as CategoriaProcedimiento | '' })}
              className="form-input"
            >
              <option value="">Seleccionar categoría...</option>
              {(Object.keys(categoriaLabels) as CategoriaProcedimiento[]).map(cat => (
                <option key={cat} value={cat}>{categoriaLabels[cat]}</option>
              ))}
            </select>
          </div>

          {/* Título con buscador */}
          <div ref={tituloRef} className="relative">
            <label className="form-label">Título *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={tituloSearch}
                onChange={e => {
                  setTituloSearch(e.target.value);
                  setForm(prev => ({ ...prev, titulo: e.target.value }));
                  setShowTituloDropdown(true);
                }}
                onFocus={() => setShowTituloDropdown(true)}
                className="form-input pl-10"
                required
                placeholder="Buscar o escribir procedimiento..."
              />
            </div>
            {showTituloDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {catalogSuggestions.length > 0 ? (
                  catalogSuggestions.map(p => (
                    <button
                      key={p.titulo}
                      type="button"
                      onClick={() => selectCatalogProc(p.titulo)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between"
                    >
                      <span>{p.titulo}</span>
                      <span className="text-xs text-gray-400">{categoriaLabels[p.categoria] || p.categoria}</span>
                    </button>
                  ))
                ) : tituloSearch.trim() ? (
                  <div className="p-3">
                    <p className="text-xs text-gray-500 mb-2">"{tituloSearch}" no está en el catálogo</p>
                    <button
                      type="button"
                      onClick={() => {
                        // Añadir al catálogo local (sesión actual) con la categoría seleccionada
                        const catSeleccionada = (form.categoria || 'otro') as CategoriaProcedimiento;
                        const nuevo: ProcedimientoCatalogo = {
                          titulo: tituloSearch.trim(),
                          categoria: catSeleccionada,
                          documentos_requeridos: []
                        };
                        addProcedimientoCatalogo(nuevo);
                        // Pasar explícitamente la categoría para que se respete
                        selectCatalogProc(nuevo.titulo, catSeleccionada);
                      }}
                      className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir "{tituloSearch}" al catálogo
                      {form.categoria && <span className="text-xs text-blue-500">({categoriaLabels[form.categoria]})</span>}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Concepto *</label>
            <input type="text" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} className="form-input" required placeholder="Ej: Tramitación NIE por arraigo" />
          </div>
          <div>
            <label className="form-label">Presupuesto (€) *</label>
            <input type="number" step="0.01" min="0" value={form.presupuesto} onChange={e => setForm({ ...form, presupuesto: parseFloat(e.target.value) || 0 })} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Estado</label>
            <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as EstadoProcedimiento })} className="form-input">
              {estadosDisponibles.map(est => (
                <option key={est} value={est}>{estadoProcLabel[est]}</option>
              ))}
            </select>
            {!isEditing && (
              <p className="text-xs text-gray-500 mt-1">Más estados disponibles al editar el procedimiento</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* ── Interesado ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Datos del interesado <span className="text-gray-400 font-normal text-xs">(si difiere del cliente)</span></legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">NIE / documento interesado</label>
            <input type="text" value={form.nie_interesado} onChange={e => setForm({ ...form, nie_interesado: e.target.value })} className="form-input" placeholder="Y1234567X" />
          </div>
          <div>
            <label className="form-label">Nombre interesado</label>
            <input type="text" value={form.nombre_interesado} onChange={e => setForm({ ...form, nombre_interesado: e.target.value })} className="form-input" />
          </div>
        </div>
      </fieldset>

      {/* ── Entrada ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend">Entrada / Señal</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="tiene_entrada" checked={form.tiene_entrada} onChange={e => setForm({ ...form, tiene_entrada: e.target.checked })} className="form-checkbox" />
            <label htmlFor="tiene_entrada" className="form-label" style={{ marginBottom: 0 }}>¿Paga entrada?</label>
          </div>
          {form.tiene_entrada && (
            <div>
              <label className="form-label">Importe de entrada (€)</label>
              <input type="number" step="0.01" min="0" value={form.importe_entrada || ''} onChange={e => setForm({ ...form, importe_entrada: parseFloat(e.target.value) || 0 })} className="form-input" />
            </div>
          )}
        </div>
      </fieldset>

      {/* ── Expediente (condicional) ── */}
      {(showExpedienteRef || isEditing) && (
        <fieldset className="form-fieldset">
          <legend className="form-legend">
            Datos del expediente
            {!isEditing && <span className="text-gray-400 font-normal text-xs ml-2">(se completarán al presentar)</span>}
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Referencia expediente</label>
              <input
                type="text"
                value={form.expediente_referencia}
                onChange={e => setForm({ ...form, expediente_referencia: e.target.value })}
                className="form-input"
                placeholder="EXP-2024/001"
                disabled={!isEditing && form.estado === 'pendiente_presentar'}
              />
              {!isEditing && form.estado === 'pendiente_presentar' && (
                <p className="text-xs text-amber-600 mt-1">Disponible cuando el procedimiento se presente</p>
              )}
            </div>
            <div>
              <label className="form-label">Fecha presentación</label>
              <input
                type="date"
                value={form.fecha_presentacion}
                onChange={e => setForm({ ...form, fecha_presentacion: e.target.value })}
                className="form-input"
                disabled={!isEditing && form.estado === 'pendiente_presentar'}
              />
            </div>
            {showResolucion && (
              <div>
                <label className="form-label">Fecha resolución</label>
                <input type="date" value={form.fecha_resolucion} onChange={e => setForm({ ...form, fecha_resolucion: e.target.value })} className="form-input" />
              </div>
            )}
          </div>
        </fieldset>
      )}

      {/* ── Documentos requeridos (checklist) ── */}
      <fieldset className="form-fieldset">
        <legend className="form-legend flex items-center justify-between w-full">
          <span>
            <FileText className="w-4 h-4 inline mr-1" />
            Documentos requeridos
            {docsTotal > 0 && (
              <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${docsAdjuntados === docsTotal ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {docsAdjuntados}/{docsTotal}
              </span>
            )}
          </span>
          {/* Botón para cargar docs por defecto si hay un título seleccionado del catálogo */}
          {form.titulo && docsPorDefecto.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (docsPorDefecto.length > 0) {
                  // Merge: mantener estado adjuntado de docs existentes, añadir nuevos
                  const merged = [...docsRequeridos];
                  docsPorDefecto.forEach((d: DocumentoRequerido) => {
                    if (!merged.find(m => m.nombre === d.nombre)) {
                      merged.push({ ...d });
                    }
                  });
                  setDocsRequeridos(merged);
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Cargar docs por defecto
            </button>
          )}
        </legend>

        {docsRequeridos.length > 0 ? (
          <div className="space-y-1 mb-3">
            {docsRequeridos.map((doc, idx) => (
              <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${doc.adjuntado ? 'bg-green-50/50 border-green-200' : 'border-gray-200 hover:border-gray-300'}`}>
                <button type="button" onClick={() => toggleDoc(idx)} className="flex-shrink-0">
                  {doc.adjuntado
                    ? <CheckSquare className="w-4 h-4 text-green-600" />
                    : <Square className="w-4 h-4 text-gray-300" />
                  }
                </button>
                <span className={`flex-1 text-sm ${doc.adjuntado ? 'line-through text-gray-400' : 'text-gray-800'}`}>{doc.nombre}</span>
                <button type="button" onClick={() => removeDoc(idx)} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors" title="Eliminar">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">No hay documentos requeridos. Selecciona un procedimiento del catálogo o añádelos manualmente.</p>
        )}

        {/* Añadir documento manual */}
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoDocNombre}
            onChange={e => setNuevoDocNombre(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDoc(); } }}
            className="form-input flex-1 text-sm"
            placeholder="Añadir documento requerido..."
          />
          <button type="button" onClick={addDoc} className="btn btn-secondary btn-sm" disabled={!nuevoDocNombre.trim()}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </fieldset>

      {/* ── Notas ── */}
      <div>
        <label className="form-label">Notas</label>
        <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} className="form-input" rows={2} placeholder="Observaciones..." />
      </div>

      {/* ── Acciones ── */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear procedimiento'}
        </button>
      </div>
    </form>
  );
}
