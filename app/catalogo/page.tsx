'use client';

import { useState, useMemo, useEffect } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { Modal } from '@/components/modal';
import { 
  CATEGORIA_LABELS, 
  getCatalogoCompleto,
  getCategoriasCustom,
  saveCategoriasCustom,
  addProcedimientoCatalogo,
  updateProcedimientoCatalogo,
  deleteProcedimientoCatalogo,
  getAllCategoriaLabels,
  type ProcedimientoCatalogo
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
  CheckSquare
} from 'lucide-react';

export default function CatalogoPage() {
  const [catalogo, setCatalogo] = useState<ProcedimientoCatalogo[]>([]);
  const [categoriasCustom, setCategoriasCustom] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
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

  // Cargar datos al montar
  useEffect(() => {
    setCatalogo(getCatalogoCompleto());
    setCategoriasCustom(getCategoriasCustom());
    setLoading(false);
  }, []);

  // Recargar cuando cambian las dependencias de localStorage
  const recargarCatalogo = () => {
    setCatalogo(getCatalogoCompleto());
    setCategoriasCustom(getCategoriasCustom());
  };

  // Categorías combinadas (defaults + custom)
  const todasCategorias = useMemo(() => {
    return getAllCategoriaLabels();
  }, [categoriasCustom]);

  // Agrupar por categoría
  const catalogoPorCategoria = useMemo(() => {
    const filtered = catalogo.filter(p => {
      const matchSearch = !searchTerm || p.titulo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = !categoriaFilter || p.categoria === categoriaFilter;
      return matchSearch && matchCat;
    });
    
    const grupos: Record<string, ProcedimientoCatalogo[]> = {};
    filtered.forEach(p => {
      if (!grupos[p.categoria]) grupos[p.categoria] = [];
      grupos[p.categoria].push(p);
    });
    return grupos;
  }, [catalogo, searchTerm, categoriaFilter]);

  const toggleExpand = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleAddProc = () => {
    if (!formTitulo.trim()) return;
    
    const nuevo: ProcedimientoCatalogo = {
      titulo: formTitulo.trim(),
      categoria: formCategoria,
      documentos_requeridos: formDocs,
    };
    
    if (addProcedimientoCatalogo(nuevo)) {
      recargarCatalogo();
      resetForm();
      setShowAddModal(false);
    } else {
      alert('Ya existe un procedimiento con ese título');
    }
  };

  const handleUpdateProc = () => {
    if (!editingProc || !formTitulo.trim()) return;
    
    const actualizado: ProcedimientoCatalogo = {
      titulo: formTitulo.trim(),
      categoria: formCategoria,
      documentos_requeridos: formDocs,
    };
    
    if (updateProcedimientoCatalogo(editingProc.titulo, actualizado)) {
      recargarCatalogo();
      resetForm();
      setEditingProc(null);
      setShowAddModal(false);
    }
  };

  const handleDeleteProc = (titulo: string) => {
    if (!window.confirm(`¿Eliminar "${titulo}" del catálogo?`)) return;
    deleteProcedimientoCatalogo(titulo);
    recargarCatalogo();
  };

  const handleAddCategoria = () => {
    if (!nuevaCategoriaId.trim() || !nuevaCategoriaNombre.trim()) return;
    
    const id = nuevaCategoriaId.toLowerCase().replace(/\s+/g, '_');
    const nuevasCats = {
      ...categoriasCustom,
      [id]: nuevaCategoriaNombre.trim()
    };
    setCategoriasCustom(nuevasCats);
    saveCategoriasCustom(nuevasCats);
    setNuevaCategoriaId('');
    setNuevaCategoriaNombre('');
    setShowAddCategoriaModal(false);
  };

  const handleDeleteCategoria = (catId: string) => {
    if (!window.confirm(`¿Eliminar la categoría "${todasCategorias[catId]}"? Los procedimientos pasarán a "Otro".`)) return;
    
    // Eliminar de custom
    const { [catId]: _, ...rest } = categoriasCustom;
    setCategoriasCustom(rest);
    saveCategoriasCustom(rest);
    
    // Los procedimientos de esa categoría quedarán con una categoría que ya no existe
    // Al recargar se mostrarán con el ID de categoría directamente
    recargarCatalogo();
  };

  const addDocToForm = () => {
    if (!nuevoDocInput.trim()) return;
    setFormDocs(prev => [...prev, { 
      nombre: nuevoDocInput.trim(), 
      adjuntado: false, 
      notas: null 
    }]);
    setNuevoDocInput('');
  };

  const removeDocFromForm = (idx: number) => {
    setFormDocs(prev => prev.filter((_, i) => i !== idx));
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
                                >
                                  <FileText className="w-3 h-3" />
                                  {doc.nombre}
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
              {formDocs.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <CheckSquare className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-sm">{doc.nombre}</span>
                  <button
                    onClick={() => removeDocFromForm(idx)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
    </LayoutShell>
  );
}
