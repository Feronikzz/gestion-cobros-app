'use client';

import { useState, useMemo, useEffect } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { Modal } from '@/components/modal';
import { 
  CATEGORIA_LABELS, 
  getCatalogoCompleto,
  getCategoriasCustom,
  saveCategoriaCustom,
  deleteCategoriaCustom,
  addProcedimientoCatalogo,
  updateProcedimientoCatalogo,
  deleteProcedimientoCatalogo,
  getAllCategoriaLabels,
  invalidateCache,
  propagateDocsToExistingProcedimientos,
  countAffectedProcedimientos,
  type ProcedimientoCatalogo,
  type PropagationResult
} from '@/lib/catalogo-procedimientos';
import type { DocumentoRequerido, CategoriaProcedimiento } from '@/lib/supabase/types';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Save,
  X,
  Search,
  Folder,
  Tag,
  CheckSquare,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  GripVertical,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useConfirm } from '@/components/confirm-dialog';

export default function CatalogoPage() {
  const { confirm } = useConfirm();
  const [catalogo, setCatalogo] = useState<ProcedimientoCatalogo[]>([]);
  const [categoriasCustom, setCategoriasCustom] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [categoriaFilter, setCategoriaFilter] = useState<CategoriaProcedimiento | ''>('');
  
  // UI State
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoriaModal, setShowAddCategoriaModal] = useState(false);
  const [editingProc, setEditingProc] = useState<ProcedimientoCatalogo | null>(null);
  
  // Form state
  const [formTitulo, setFormTitulo] = useState('');
  const [formCategoria, setFormCategoria] = useState<CategoriaProcedimiento>('otro');
  const [formDocs, setFormDocs] = useState<DocumentoRequerido[]>([]);
  const [nuevoDocInput, setNuevoDocInput] = useState('');
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
  const [nuevaCategoriaId, setNuevaCategoriaId] = useState('');
  
  // Estado para edición expandida de documento
  const [expandedDocIdx, setExpandedDocIdx] = useState<number | null>(null);

  // Propagación
  const [showPropagateModal, setShowPropagateModal] = useState(false);
  const [propagateTitle, setPropagateTitle] = useState('');
  const [propagateNewDocs, setPropagateNewDocs] = useState<DocumentoRequerido[]>([]);
  const [propagateOldDocs, setPropagateOldDocs] = useState<DocumentoRequerido[]>([]);
  const [propagateCount, setPropagateCount] = useState(0);
  const [propagating, setPropagating] = useState(false);
  const [propagateResult, setPropagateResult] = useState<PropagationResult | null>(null);

  // Cargar datos al montar (async desde Supabase)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [catalogoData, categoriasData] = await Promise.all([
          getCatalogoCompleto(),
          getCategoriasCustom()
        ]);
        setCatalogo(catalogoData);
        setCategoriasCustom(categoriasData);
      } catch (err) {
        console.error('Error cargando catálogo:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Recargar datos desde Supabase
  const recargarCatalogo = async () => {
    invalidateCache();
    const [catalogoData, categoriasData] = await Promise.all([
      getCatalogoCompleto(),
      getCategoriasCustom()
    ]);
    setCatalogo(catalogoData);
    setCategoriasCustom(categoriasData);
  };

  // Categorías combinadas (defaults + custom) - ahora async
  const [todasCategorias, setTodasCategorias] = useState<Record<string, string>>(CATEGORIA_LABELS);
  
  useEffect(() => {
    const loadCategorias = async () => {
      const cats = await getAllCategoriaLabels();
      setTodasCategorias(cats);
    };
    loadCategorias();
  }, [categoriasCustom]);

  // Agrupar por categoría
  const catalogoPorCategoria = useMemo(() => {
    const filtered = catalogo.filter(p => {
      const matchSearch = !debouncedSearchTerm || p.titulo.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchCat = !categoriaFilter || p.categoria === categoriaFilter;
      return matchSearch && matchCat;
    });
    
    const grupos: Record<string, ProcedimientoCatalogo[]> = {};
    filtered.forEach(p => {
      if (!grupos[p.categoria]) grupos[p.categoria] = [];
      grupos[p.categoria].push(p);
    });
    return grupos;
  }, [catalogo, debouncedSearchTerm, categoriaFilter]);

  const toggleExpand = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleAddProc = async () => {
    if (!formTitulo.trim()) return;
    
    const nuevo: ProcedimientoCatalogo = {
      titulo: formTitulo.trim(),
      categoria: formCategoria,
      documentos_requeridos: formDocs,
    };
    
    const success = await addProcedimientoCatalogo(nuevo);
    if (success) {
      await recargarCatalogo();
      resetForm();
      setShowAddModal(false);
    } else {
      toast.error('Ya existe un procedimiento con ese título');
    }
  };

  const handleUpdateProc = async () => {
    if (!editingProc || !formTitulo.trim()) return;
    
    const actualizado: ProcedimientoCatalogo = {
      titulo: formTitulo.trim(),
      categoria: formCategoria,
      documentos_requeridos: formDocs,
    };
    
    // Guardar docs anteriores antes de actualizar
    const oldDocs = [...editingProc.documentos_requeridos];
    const tituloParaPropagar = editingProc.titulo; // usar título original para buscar procedimientos
    
    const success = await updateProcedimientoCatalogo(editingProc.titulo, actualizado);
    if (success) {
      await recargarCatalogo();
      resetForm();
      setEditingProc(null);
      setShowAddModal(false);
      
      // Comprobar si hay procedimientos afectados y ofrecer propagación
      const count = await countAffectedProcedimientos(tituloParaPropagar);
      if (count > 0) {
        setPropagateTitle(tituloParaPropagar);
        setPropagateNewDocs(formDocs);
        setPropagateOldDocs(oldDocs);
        setPropagateCount(count);
        setPropagateResult(null);
        setShowPropagateModal(true);
      }
    }
  };
  
  const handlePropagate = async () => {
    setPropagating(true);
    setPropagateResult(null);
    try {
      const result = await propagateDocsToExistingProcedimientos(
        propagateTitle,
        propagateNewDocs,
        propagateOldDocs
      );
      setPropagateResult(result);
    } catch (err: any) {
      setPropagateResult({ updated: 0, skipped: 0, errors: 1, details: [err.message] });
    } finally {
      setPropagating(false);
    }
  };

  const handleDeleteProc = async (titulo: string) => {
    if (await confirm({ 
      title: 'Eliminar procedimiento', 
      message: `¿Eliminar "${titulo}" del catálogo?`, 
      variant: 'danger', 
      confirmLabel: 'Eliminar' 
    })) {
      await deleteProcedimientoCatalogo(titulo);
      await recargarCatalogo();
    }
  };

  const handleAddCategoria = async () => {
    if (!nuevaCategoriaId.trim() || !nuevaCategoriaNombre.trim()) return;
    
    const id = nuevaCategoriaId.toLowerCase().replace(/\s+/g, '_');
    const success = await saveCategoriaCustom(id, nuevaCategoriaNombre.trim());
    if (success) {
      await recargarCatalogo();
      setNuevaCategoriaId('');
      setNuevaCategoriaNombre('');
      setShowAddCategoriaModal(false);
    } else {
      toast.error('Error al guardar la categoría');
    }
  };

  const handleDeleteCategoria = async (catId: string) => {
    if (await confirm({ 
      title: 'Eliminar categoría', 
      message: `¿Eliminar la categoría "${todasCategorias[catId]}"? Los procedimientos pasarán a "Otro".\n\nIMPORTANTE: Esto no se puede deshacer.`, 
      variant: 'danger', 
      confirmLabel: 'Eliminar categoría' 
    })) {
      const success = await deleteCategoriaCustom(catId);
      if (success) {
        await recargarCatalogo();
      } else {
        toast.error('Error al eliminar la categoría');
      }
    }
  };

  const addDocToForm = () => {
    if (!nuevoDocInput.trim()) return;
    setFormDocs(prev => [...prev, { 
      nombre: nuevoDocInput.trim(), 
      adjuntado: false, 
      notas: null,
      descripcion: null,
      enlace: null,
    }]);
    setNuevoDocInput('');
  };

  const removeDocFromForm = (idx: number) => {
    setFormDocs(prev => prev.filter((_, i) => i !== idx));
    if (expandedDocIdx === idx) setExpandedDocIdx(null);
    else if (expandedDocIdx !== null && expandedDocIdx > idx) setExpandedDocIdx(expandedDocIdx - 1);
  };

  const updateDocField = (idx: number, field: 'nombre' | 'descripcion' | 'enlace', value: string) => {
    setFormDocs(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value || null } : d));
  };

  const openEditModal = (proc: ProcedimientoCatalogo) => {
    setEditingProc(proc);
    setFormTitulo(proc.titulo);
    setFormCategoria(proc.categoria as CategoriaProcedimiento);
    setFormDocs([...proc.documentos_requeridos]);
    setShowAddModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setEditingProc(null);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormTitulo('');
    setFormCategoria('otro');
    setFormDocs([]);
    setNuevoDocInput('');
    setExpandedDocIdx(null);
  };

  // Estadísticas
  const stats = useMemo(() => {
    const total = catalogo.length;
    const conDocs = catalogo.filter(p => p.documentos_requeridos.length > 0).length;
    return { total, conDocs };
  }, [catalogo]);

  if (loading) {
    return <LayoutShell title="Catálogo de Servicios"><div className="p-8">Cargando...</div></LayoutShell>;
  }

  return (
    <LayoutShell 
      title="Catálogo de Servicios" 
      description="Gestiona los procedimientos, categorías y documentación requerida para tus expedientes."
    >
      {/* ─── Header y Estadísticas ─── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Catálogo de Servicios</h2>
            <p className="text-blue-100 mt-1">Gestiona procedimientos, categorías y documentación requerida</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAddCategoriaModal(true)}
              className="btn bg-white/20 hover:bg-white/30 text-white border-0 flex items-center gap-2"
            >
              <Tag className="w-4 h-4" /> Nueva Categoría
            </button>
            <button 
              onClick={openAddModal}
              className="btn bg-white text-blue-700 hover:bg-blue-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Procedimiento
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          <div>
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-blue-100 text-sm">Procedimientos</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{Object.keys(todasCategorias).length}</div>
            <div className="text-blue-100 text-sm">Categorías</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{stats.conDocs}</div>
            <div className="text-blue-100 text-sm">Con documentación</div>
          </div>
        </div>
      </div>

      {/* ─── Filtros ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar procedimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value as CategoriaProcedimiento | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {Object.entries(todasCategorias).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {(searchTerm || categoriaFilter) && (
            <button 
              onClick={() => { setSearchTerm(''); setCategoriaFilter(''); }}
              className="text-red-600 hover:text-red-700 px-3"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ─── Gestión de Categorías ─── */}
      {Object.keys(categoriasCustom).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" /> Categorías personalizadas
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoriasCustom).map(([id, label]) => (
              <span 
                key={id} 
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm border border-purple-200"
              >
                {label}
                <button 
                  onClick={() => handleDeleteCategoria(id)}
                  className="text-purple-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Lista de Procedimientos por Categoría ─── */}
      <div className="space-y-4">
        {Object.entries(catalogoPorCategoria).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron procedimientos</p>
            <button onClick={openAddModal} className="mt-2 text-blue-600 hover:text-blue-700">
              Añadir el primero
            </button>
          </div>
        ) : (
          Object.entries(catalogoPorCategoria).map(([cat, procs]) => (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Cabecera de categoría */}
              <button
                onClick={() => toggleExpand(cat)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedCats.has(cat) ? 
                    <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  }
                  <span className="font-semibold text-gray-800">{todasCategorias[cat] || cat}</span>
                  <span className="text-sm text-gray-500">({procs.length})</span>
                </div>
                <div className="text-sm text-gray-400">
                  {procs.reduce((acc, p) => acc + p.documentos_requeridos.length, 0)} docs requeridos
                </div>
              </button>
              
              {/* Lista de procedimientos */}
              {expandedCats.has(cat) && (
                <div className="divide-y divide-gray-100">
                  {procs.map((proc) => (
                    <div key={proc.titulo} className="p-4 hover:bg-blue-50/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{proc.titulo}</h4>
                          {proc.documentos_requeridos.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {proc.documentos_requeridos.map((doc, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                  title={doc.descripcion || undefined}
                                >
                                  <FileText className="w-3 h-3" />
                                  {doc.nombre}
                                  {(doc.descripcion || doc.enlace) && (
                                    <Info className="w-3 h-3 text-blue-400" />
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => openEditModal(proc)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProc(proc.titulo)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ─── Modal: Añadir/Editar Procedimiento ─── */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); resetForm(); setEditingProc(null); }}
        title={editingProc ? 'Editar Procedimiento' : 'Nuevo Procedimiento'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="form-label">Título *</label>
            <input
              type="text"
              value={formTitulo}
              onChange={(e) => setFormTitulo(e.target.value)}
              className="form-input w-full"
              placeholder="Ej: Regularización 2026"
            />
          </div>
          
          <div>
            <label className="form-label">Categoría *</label>
            <select
              value={formCategoria}
              onChange={(e) => setFormCategoria(e.target.value as CategoriaProcedimiento)}
              className="form-input w-full"
            >
              {Object.entries(todasCategorias).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">Documentación requerida</label>
            <div className="space-y-2">
              {formDocs.map((doc, idx) => {
                const isExpanded = expandedDocIdx === idx;
                return (
                  <div key={idx} className={`border rounded-lg transition-colors ${
                    isExpanded ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {/* Fila principal del doc */}
                    <div className="flex items-center gap-2 p-2">
                      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <input
                        type="text"
                        value={doc.nombre}
                        onChange={(e) => updateDocField(idx, 'nombre', e.target.value)}
                        className="flex-1 text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 px-1 py-0.5 rounded"
                        placeholder="Nombre del documento"
                      />
                      {(doc.descripcion || doc.enlace) && (
                        <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                      <button
                        onClick={() => setExpandedDocIdx(isExpanded ? null : idx)}
                        className={`p-1 rounded transition-colors ${
                          isExpanded ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        title="Descripción y enlace"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeDocFromForm(idx)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                        title="Eliminar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Panel expandido: descripción + enlace */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 space-y-2 border-t border-blue-200">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Descripción / Instrucciones</label>
                          <textarea
                            value={doc.descripcion || ''}
                            onChange={(e) => updateDocField(idx, 'descripcion', e.target.value)}
                            className="form-input w-full text-sm mt-1"
                            rows={2}
                            placeholder="Ej: Formulario oficial para solicitud de regularización..."
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Enlace externo
                          </label>
                          <input
                            type="url"
                            value={doc.enlace || ''}
                            onChange={(e) => updateDocField(idx, 'enlace', e.target.value)}
                            className="form-input w-full text-sm mt-1"
                            placeholder="https://ejemplo.com/formulario.pdf"
                          />
                          {doc.enlace && (
                            <a
                              href={doc.enlace}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Abrir enlace
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoDocInput}
                  onChange={(e) => setNuevoDocInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDocToForm())}
                  className="form-input flex-1"
                  placeholder="Añadir documento..."
                />
                <button
                  type="button"
                  onClick={addDocToForm}
                  className="btn btn-secondary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => { setShowAddModal(false); resetForm(); setEditingProc(null); }}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={editingProc ? handleUpdateProc : handleAddProc}
              disabled={!formTitulo.trim()}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingProc ? 'Guardar cambios' : 'Añadir al catálogo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal: Añadir Categoría ─── */}
      <Modal
        isOpen={showAddCategoriaModal}
        onClose={() => { setShowAddCategoriaModal(false); setNuevaCategoriaId(''); setNuevaCategoriaNombre(''); }}
        title="Nueva Categoría"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">ID interno (solo letras, números y guiones bajos)</label>
            <input
              type="text"
              value={nuevaCategoriaId}
              onChange={(e) => setNuevaCategoriaId(e.target.value.replace(/\s+/g, '_').toLowerCase())}
              className="form-input w-full"
              placeholder="ej: nueva_categoria"
            />
            <p className="text-xs text-gray-400 mt-1">Se usará internamente en el sistema</p>
          </div>
          <div>
            <label className="form-label">Nombre visible</label>
            <input
              type="text"
              value={nuevaCategoriaNombre}
              onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
              className="form-input w-full"
              placeholder="Ej: Nueva Categoría"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => { setShowAddCategoriaModal(false); setNuevaCategoriaId(''); setNuevaCategoriaNombre(''); }}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddCategoria}
              disabled={!nuevaCategoriaId.trim() || !nuevaCategoriaNombre.trim()}
              className="btn btn-primary"
            >
              Crear Categoría
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal: Propagar cambios a procedimientos existentes ─── */}
      <Modal 
        isOpen={showPropagateModal} 
        onClose={() => setShowPropagateModal(false)} 
        title="Actualizar expedientes existentes"
      >
        <div className="space-y-4">
          {!propagateResult ? (
            <>
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">
                    Se han encontrado <span className="text-lg">{propagateCount}</span> expediente{propagateCount !== 1 ? 's' : ''} con el título &quot;{propagateTitle}&quot;
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    ¿Quieres actualizar sus documentos requeridos con los nuevos del catálogo?
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-2">
                <p className="font-medium">¿Qué ocurrirá?</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Se <strong>añadirán</strong> los nuevos documentos del catálogo</li>
                  <li>Se <strong>eliminarán</strong> los documentos que ya no estén en el catálogo</li>
                  <li>Los documentos <strong>renombrados</strong> se actualizan preservando el estado de adjuntado y se marcan con <strong>⚠ Revisar</strong> (mostrando nombre anterior y nuevo)</li>
                  <li>Los documentos <strong>añadidos manualmente</strong> a cada expediente se mantendrán intactos</li>
                  <li>El estado de <strong>adjuntado</strong> de cada documento existente se preservará</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowPropagateModal(false)}
                  className="btn btn-secondary"
                >
                  No, solo catálogo
                </button>
                <button
                  onClick={handlePropagate}
                  disabled={propagating}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {propagating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Actualizando...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Sí, actualizar {propagateCount} expediente{propagateCount !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                propagateResult.errors > 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                {propagateResult.errors > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${propagateResult.errors > 0 ? 'text-red-800' : 'text-green-800'}`}>
                    Resultado de la actualización
                  </p>
                  <div className="mt-2 text-sm space-y-1">
                    <p className="text-green-700">✓ {propagateResult.updated} expediente{propagateResult.updated !== 1 ? 's' : ''} actualizado{propagateResult.updated !== 1 ? 's' : ''}</p>
                    {propagateResult.errors > 0 && (
                      <p className="text-red-700">✗ {propagateResult.errors} error{propagateResult.errors !== 1 ? 'es' : ''}</p>
                    )}
                  </div>
                  {propagateResult.details.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600 bg-white/50 rounded p-2">
                      {propagateResult.details.map((d, i) => <p key={i}>{d}</p>)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowPropagateModal(false)}
                  className="btn btn-primary"
                >
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </LayoutShell>
  );
}
