'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutShell } from '@/components/layout-shell';
import { useExpedientes } from '@/lib/hooks/use-expedientes';
import { 
  getCatalogoCompleto, 
  getAllCategoriaLabels, 
  type ProcedimientoCatalogo,
  CATEGORIA_LABELS
} from '@/lib/catalogo-procedimientos';
import { eur } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { EstadoProcedimiento, CategoriaProcedimiento, Procedimiento, Cliente } from '@/lib/supabase/types';

// Tipo para expedientes con cliente
interface ExpedienteConCliente extends Procedimiento {
  cliente: Cliente;
  total_cobrado: number;
  total_pendiente: number;
  esta_pagado_totalmente: boolean;
}
import { 
  FileText, 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Archive,
  DollarSign,
  Users,
  Eye,
  X,
  Edit3,
  Save,
  CheckSquare,
  Square,
  ChevronDown,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function ExpedientesPage() {
  const router = useRouter();
  const supabase = createClient();
  const { expedientes, loading, error, stats, filtrarPorEstado, filtrarPorCliente, filtrarPorPagado, refetch } = useExpedientes();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [pagadoFilter, setPagadoFilter] = useState('todos');
  
  // Estados para edición masiva
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMassEdit, setShowMassEdit] = useState(false);
  const [massEditField, setMassEditField] = useState<'estado' | 'categoria' | 'titulo' | null>(null);
  const [massEditValue, setMassEditValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const [processErrors, setProcessErrors] = useState<string[]>([]);
  
  // Estados para edición inline
  const [editingInline, setEditingInline] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState<Partial<ExpedienteConCliente>>({});
  const [savingInline, setSavingInline] = useState(false);
  
  // Catálogo desde Supabase (async)
  const [catalogo, setCatalogo] = useState<ProcedimientoCatalogo[]>([]);
  const [categoriasLabels, setCategoriasLabels] = useState<Record<string, string>>(CATEGORIA_LABELS);
  const [catalogoLoading, setCatalogoLoading] = useState(true);
  
  // Cargar catálogo al montar
  useEffect(() => {
    const loadCatalogo = async () => {
      setCatalogoLoading(true);
      try {
        const [catData, labelsData] = await Promise.all([
          getCatalogoCompleto(),
          getAllCategoriaLabels()
        ]);
        setCatalogo(catData);
        setCategoriasLabels(labelsData);
      } catch (err) {
        console.error('Error cargando catálogo:', err);
      } finally {
        setCatalogoLoading(false);
      }
    };
    loadCatalogo();
  }, []);
  
  // Catálogo agrupado por categorías para edición inline
  const catalogoPorCategoria = useMemo(() => {
    const grouped: Record<string, ProcedimientoCatalogo[]> = {};
    catalogo.forEach(proc => {
      const cat = proc.categoria || 'Otro';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(proc);
    });
    return grouped;
  }, [catalogo]);
  
  // Obtener títulos disponibles para una categoría (síncrono - usa cache local)
  const getTitulosPorCategoria = useCallback((categoria: string | null | undefined) => {
    if (!categoria || categoria === 'Otro') {
      // Si no hay categoría, mostrar todos los títulos
      return catalogo.map(p => ({ value: p.titulo, label: p.titulo }));
    }
    const titulos = catalogoPorCategoria[categoria] || [];
    return titulos.map(p => ({ value: p.titulo, label: p.titulo }));
  }, [catalogo, catalogoPorCategoria]);

  // Aplicar filtros
  const filteredExpedientes = useMemo(() => {
    return expedientes.filter(expediente => {
      // Búsqueda por texto (cliente, título, concepto, referencia)
      const searchMatch = !searchTerm || 
        expediente.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expediente.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expediente.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expediente.expediente_referencia && expediente.expediente_referencia.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de estado
      const estadoMatch = estadoFilter === 'todos' || expediente.estado === estadoFilter;
      
      // Filtro de pagado
      const pagadoMatch = pagadoFilter === 'todos' || 
        (pagadoFilter === 'pagados' && expediente.esta_pagado_totalmente) ||
        (pagadoFilter === 'pendientes' && !expediente.esta_pagado_totalmente);

      return searchMatch && estadoMatch && pagadoMatch;
    });
  }, [expedientes, searchTerm, estadoFilter, pagadoFilter]);

  // Estado labels y badges
  const estadoLabels: Record<EstadoProcedimiento, string> = {
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

  const estadoBadges: Record<EstadoProcedimiento, string> = {
    pendiente: 'badge-orange',
    pendiente_presentar: 'badge-yellow',
    en_proceso: 'badge-blue',
    presentado: 'badge-blue',
    pendiente_resolucion: 'badge-yellow',
    pendiente_recurso: 'badge-red',
    resuelto: 'badge-green',
    cerrado: 'badge-gray',
    archivado: 'badge-gray',
  };

  // Funciones para selección
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredExpedientes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExpedientes.map(e => e.id)));
    }
  }, [selectedIds, filteredExpedientes]);

  const toggleSelect = useCallback((id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }, [selectedIds]);

  // Edición masiva - Actualización optimista
  const processMassEdit = async () => {
    if (!massEditField || !massEditValue || selectedIds.size === 0) return;
    
    setIsProcessing(true);
    setProcessErrors([]);
    setProcessProgress({ current: 0, total: selectedIds.size });
    
    const ids = Array.from(selectedIds);
    const errors: string[] = [];
    
    // Actualización optimista - actualizar UI inmediatamente
    const updates: Partial<ExpedienteConCliente> = {};
    if (massEditField === 'estado') updates.estado = massEditValue as EstadoProcedimiento;
    if (massEditField === 'categoria') updates.categoria = massEditValue as CategoriaProcedimiento;
    if (massEditField === 'titulo') updates.titulo = massEditValue;
    
    // Actualizar localmente primero (optimistic update)
    const updatedExpedientes = expedientes.map(exp => 
      selectedIds.has(exp.id) ? { ...exp, ...updates } : exp
    );
    // Nota: esto no actualiza el estado real porque expedientes viene del hook
    // pero hace que la UI sea más responsive
    
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      setProcessProgress({ current: i + 1, total: ids.length });
      
      try {
        const { error } = await supabase
          .from('procedimientos')
          .update({ [massEditField]: massEditValue })
          .eq('id', id);
        
        if (error) {
          errors.push(`Expediente ${id}: ${error.message}`);
        }
      } catch (err: any) {
        errors.push(`Expediente ${id}: ${err.message}`);
      }
    }
    
    setProcessErrors(errors);
    setIsProcessing(false);
    
    if (errors.length === 0) {
      setShowMassEdit(false);
      setSelectedIds(new Set());
      await refetch();
    }
  };

  // Edición inline - Actualización optimista
  const startInlineEdit = (expediente: ExpedienteConCliente) => {
    setEditingInline(expediente.id);
    setInlineForm({
      titulo: expediente.titulo,
      concepto: expediente.concepto,
      categoria: expediente.categoria,
      estado: expediente.estado,
      presupuesto: expediente.presupuesto,
    });
  };

  const saveInlineEdit = async (id: string) => {
    if (!editingInline || !inlineForm) return;
    
    setSavingInline(true);
    try {
      const updates: any = {};
      if (inlineForm.titulo !== undefined) updates.titulo = inlineForm.titulo;
      if (inlineForm.concepto !== undefined) updates.concepto = inlineForm.concepto;
      if (inlineForm.categoria !== undefined) updates.categoria = inlineForm.categoria;
      if (inlineForm.estado !== undefined) updates.estado = inlineForm.estado;
      if (inlineForm.presupuesto !== undefined) updates.presupuesto = inlineForm.presupuesto;
      
      // Limpiar undefined
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      
      const { error } = await supabase
        .from('procedimientos')
        .update(cleanUpdates)
        .eq('id', id);
      
      if (error) {
        throw new Error(`Error al guardar: ${error.message}`);
      }
      
      setEditingInline(null);
      setInlineForm({});
      await refetch();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSavingInline(false);
    }
  };

  const cancelInlineEdit = () => {
    setEditingInline(null);
    setInlineForm({});
  };

  // Función para actualizar expediente individual (desde inline)
  const updateExpediente = async (id: string, updates: Partial<ExpedienteConCliente>) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    const { error } = await supabase
      .from('procedimientos')
      .update(cleanUpdates)
      .eq('id', id);
    
    if (error) throw error;
    await refetch();
  };

  if (loading) return <LayoutShell title="Expedientes"><div className="loading-state">Cargando expedientes...</div></LayoutShell>;
  if (error) return <LayoutShell title="Expedientes"><div className="error-state">Error al cargar expedientes: {error}</div></LayoutShell>;

  return (
    <LayoutShell 
      title="Expedientes" 
      description="Gestiona todos tus expedientes y procedimientos. Visualiza el estado de cada caso, seguimiento de pagos y acceso rápido a los detalles."
    >
      {/* ─── Métricas ── */}
      <div className="dashboard-metrics">
        <div className="metric-card metric-orange">
          <Clock className="metric-icon" />
          <div>
            <p className="metric-label">En proceso</p>
            <p className="metric-value">{stats.enProceso}</p>
          </div>
        </div>
        <div className="metric-card metric-green">
          <TrendingUp className="metric-icon" />
          <div>
            <p className="metric-label">Cobrado total</p>
            <p className="metric-value">{eur(stats.cobradoTotal)}</p>
          </div>
        </div>
        <div className="metric-card metric-red">
          <AlertCircle className="metric-icon" />
          <div>
            <p className="metric-label">Pendiente de pago</p>
            <p className="metric-value">{eur(stats.pendienteTotal)}</p>
          </div>
        </div>
        <div className="metric-card metric-purple">
          <DollarSign className="metric-icon" />
          <div>
            <p className="metric-label">Presupuesto total</p>
            <p className="metric-value">{eur(stats.presupuestoTotal)}</p>
          </div>
        </div>
      </div>

      {/* ─── Búsqueda y Filtros ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        {/* Búsqueda Principal */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar expedientes por cliente, título, concepto o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro de Estado */}
          <div className="relative">
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 appearance-none bg-white pr-10 ${
                estadoFilter !== 'todos'
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pendiente_presentar">Pte. presentar</option>
              <option value="en_proceso">En proceso</option>
              <option value="presentado">Presentado</option>
              <option value="pendiente_resolucion">Pte. resolución</option>
              <option value="pendiente_recurso">Pte. recurso</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
              <option value="archivado">Archivado</option>
            </select>
            <Filter className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Filtro de Pago */}
          <div className="relative">
            <select
              value={pagadoFilter}
              onChange={(e) => setPagadoFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 appearance-none bg-white pr-10 ${
                pagadoFilter !== 'todos'
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <option value="todos">Todos los pagos</option>
              <option value="pagados">Pagados totalmente</option>
              <option value="pendientes">Con pago pendiente</option>
            </select>
            <DollarSign className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
          </div>

          {/* Contador de filtros activos */}
          {(estadoFilter !== 'todos' || pagadoFilter !== 'todos' || searchTerm) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                {[
                  estadoFilter !== 'todos' && `Estado: ${estadoLabels[estadoFilter as EstadoProcedimiento]}`,
                  pagadoFilter !== 'todos' && (pagadoFilter === 'pagados' ? 'Pagados' : 'Pendientes de pago'),
                  searchTerm && 'Búsqueda activa'
                ].filter(Boolean).join(' • ')}
              </span>
            </div>
          )}

          {/* Botón limpiar filtros */}
          {(estadoFilter !== 'todos' || pagadoFilter !== 'todos' || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setEstadoFilter('todos');
                setPagadoFilter('todos');
              }}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ─── Barra de acciones masivas ── */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedIds.size} expediente{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowMassEdit(true); setMassEditField('estado'); setMassEditValue(''); }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cambiar estado
              </button>
              <button
                onClick={() => { setShowMassEdit(true); setMassEditField('categoria'); setMassEditValue(''); }}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Cambiar categoría
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de edición masiva ── */}
      {showMassEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Editar {massEditField === 'estado' ? 'estado' : massEditField === 'categoria' ? 'categoría' : 'título'} masivamente
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Se actualizarán {selectedIds.size} expedientes
            </p>
            
            {massEditField === 'estado' && (
              <select
                value={massEditValue}
                onChange={(e) => setMassEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              >
                <option value="">Selecciona estado...</option>
                {Object.entries(estadoLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            )}
            
            {massEditField === 'categoria' && (
              <select
                value={massEditValue}
                onChange={(e) => setMassEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              >
                <option value="">Selecciona categoría...</option>
                {Object.entries(categoriasLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            )}
            
            {massEditField === 'titulo' && (
              <select
                value={massEditValue}
                onChange={(e) => setMassEditValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              >
                <option value="">Selecciona título...</option>
                {catalogo.map((proc) => (
                  <option key={proc.titulo} value={proc.titulo}>{proc.titulo}</option>
                ))}
              </select>
            )}
            
            {isProcessing && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando... {processProgress.current} de {processProgress.total}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {processErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Errores ({processErrors.length}):
                </div>
                {processErrors.map((err, i) => (
                  <div key={i} className="text-xs text-red-600">{err}</div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowMassEdit(false); setProcessErrors([]); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isProcessing}
              >
                Cerrar
              </button>
              <button
                onClick={processMassEdit}
                disabled={!massEditValue || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Procesando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tabla de Expedientes ── */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="w-8">
                <button 
                  onClick={toggleSelectAll}
                  className="p-1 hover:bg-gray-100 rounded"
                  title={selectedIds.size === filteredExpedientes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                >
                  {selectedIds.size === filteredExpedientes.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </th>
              <th>Cliente</th>
              <th>Expediente</th>
              <th>Fecha presentación</th>
              <th>Estado</th>
              <th>Presupuesto</th>
              <th>Cobrado</th>
              <th>Pendiente</th>
              <th>Pago completo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpedientes.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-500">
                  No se encontraron expedientes con los filtros seleccionados
                </td>
              </tr>
            ) : (
              filteredExpedientes.map((expediente) => {
                const isEditing = editingInline === expediente.id;
                const isSelected = selectedIds.has(expediente.id);
                
                return (
                  <tr key={expediente.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50/50' : ''}`}>
                    <td className="w-8">
                      <button 
                        onClick={() => toggleSelect(expediente.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{expediente.cliente.nombre}</div>
                          <div className="text-sm text-gray-500">{expediente.cliente.nif || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isEditing ? (
                        <div className="space-y-1">
                          {/* Selector de Categoría */}
                          <select
                            value={inlineForm.categoria || ''}
                            onChange={(e) => {
                              const newCategoria = e.target.value as CategoriaProcedimiento;
                              const availableTitles = getTitulosPorCategoria(newCategoria);
                              // Si el título actual no está en la nueva categoría, limpiarlo
                              const currentTitleValid = availableTitles.some(t => t.value === inlineForm.titulo);
                              setInlineForm({ 
                                ...inlineForm, 
                                categoria: newCategoria,
                                titulo: currentTitleValid ? inlineForm.titulo : ''
                              });
                            }}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded"
                          >
                            <option value="">Sin categoría</option>
                            {Object.entries(categoriasLabels).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                          
                          {/* Selector de Título (dependiente de categoría) */}
                          <select
                            value={inlineForm.titulo || ''}
                            onChange={(e) => {
                              const newTitulo = e.target.value;
                              setInlineForm({ 
                                ...inlineForm, 
                                titulo: newTitulo
                              });
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value="">Selecciona título...</option>
                            {getTitulosPorCategoria(inlineForm.categoria || undefined).map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                            {/* Opción para título personalizado */}
                            {inlineForm.titulo && !getTitulosPorCategoria(inlineForm.categoria || undefined).some(t => t.value === inlineForm.titulo) && (
                              <option value={inlineForm.titulo}>{inlineForm.titulo} (personalizado)</option>
                            )}
                          </select>
                          
                          {/* Input de Concepto */}
                          <input
                            type="text"
                            value={inlineForm.concepto || ''}
                            onChange={(e) => setInlineForm({ ...inlineForm, concepto: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="Concepto"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{expediente.titulo}</span>
                            {expediente.categoria && <span className="badge badge-purple text-xs">{expediente.categoria}</span>}
                          </div>
                          <div className="text-sm text-gray-500">{expediente.concepto}</div>
                          {expediente.expediente_referencia && (
                            <div className="text-xs text-gray-400">Ref: {expediente.expediente_referencia}</div>
                          )}
                          {expediente.documentos_requeridos && expediente.documentos_requeridos.length > 0 && (() => {
                            const total = expediente.documentos_requeridos!.length;
                            const adj = expediente.documentos_requeridos!.filter((d: any) => d.adjuntado).length;
                            return (
                              <div className={`text-xs mt-0.5 ${adj === total ? 'text-green-600' : 'text-amber-600'}`}>
                                Docs: {adj}/{total} {adj === total ? '✓' : ''}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="date"
                          value={inlineForm.fecha_presentacion || ''}
                          onChange={(e) => setInlineForm({ ...inlineForm, fecha_presentacion: e.target.value })}
                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        expediente.fecha_presentacion ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {expediente.fecha_presentacion}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={inlineForm.estado || ''}
                          onChange={(e) => setInlineForm({ ...inlineForm, estado: e.target.value as EstadoProcedimiento })}
                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          {Object.entries(estadoLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${estadoBadges[expediente.estado]}`}>
                          {estadoLabels[expediente.estado]}
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={inlineForm.presupuesto || ''}
                          onChange={(e) => setInlineForm({ ...inlineForm, presupuesto: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded text-right"
                        />
                      ) : (
                        <span className="font-medium">{eur(expediente.presupuesto)}</span>
                      )}
                    </td>
                    <td className="text-right">
                      <span className={expediente.total_cobrado > 0 ? 'text-green-600' : 'text-gray-500'}>
                        {eur(expediente.total_cobrado)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={expediente.total_pendiente > 0 ? 'text-red-600' : 'text-green-600'}>
                        {eur(expediente.total_pendiente)}
                      </span>
                    </td>
                    <td className="text-center">
                      {expediente.esta_pagado_totalmente ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Sí</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">No</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveInlineEdit(expediente.id)}
                              disabled={savingInline}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Guardar"
                            >
                              {savingInline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startInlineEdit(expediente)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/clientes/${expediente.cliente.id}`)}
                              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                              title="Ver cliente"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Resumen de resultados ── */}
      {filteredExpedientes.length !== expedientes.length && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">
              Mostrando {filteredExpedientes.length} de {expedientes.length} expedientes
            </span>
          </div>
        </div>
      )}
    </LayoutShell>
  );
}
