'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  DollarSign,
  Users,
  Eye,
  X,
  Edit3,
  Save,
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileX,
  FolderOpen,
  SlidersHorizontal
} from 'lucide-react';

export default function ExpedientesPage() {
  const router = useRouter();
  const supabase = createClient();
  const { expedientes, loading, error, stats, filtrarPorEstado, filtrarPorCliente, filtrarPorPagado, refetch } = useExpedientes();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [pagadoFilter, setPagadoFilter] = useState('todos');
  
  // Filtros avanzados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [tituloFilter, setTituloFilter] = useState('');
  const [docsFilter, setDocsFilter] = useState<'todos' | 'completos' | 'incompletos' | 'sin_docs'>('todos');
  const [docBusqueda, setDocBusqueda] = useState('');
  
  // Expandir documentos por expediente
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Estados para edición masiva
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMassEdit, setShowMassEdit] = useState(false);
  const [massEditField, setMassEditField] = useState<'estado' | 'categoria' | 'titulo' | null>(null);
  const [massEditValue, setMassEditValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const [processErrors, setProcessErrors] = useState<string[]>([]);
  
  // Estados para edición masiva - título dependiente de categoría
  const [massEditCategoria, setMassEditCategoria] = useState('');
  const [massEditTitulo, setMassEditTitulo] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Estados para modal de expediente
  const [showExpedienteModal, setShowExpedienteModal] = useState(false);
  const [expedienteModalData, setExpedienteModalData] = useState<ExpedienteConCliente | null>(null);
  const [modalForm, setModalForm] = useState<Partial<ExpedienteConCliente>>({});
  const [savingModal, setSavingModal] = useState(false);
  
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

  // Toggle expandir fila
  const toggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  // Títulos disponibles para el filtro de categoría seleccionada
  const titulosParaFiltro = useMemo(() => {
    if (!categoriaFilter) {
      // Todos los títulos únicos
      const set = new Set(expedientes.map(e => e.titulo));
      return Array.from(set).sort();
    }
    const set = new Set(expedientes.filter(e => e.categoria === categoriaFilter).map(e => e.titulo));
    return Array.from(set).sort();
  }, [expedientes, categoriaFilter]);

  // Categorías únicas presentes en los datos reales
  const categoriasPresentes = useMemo(() => {
    const set = new Set(expedientes.map(e => e.categoria).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [expedientes]);

  // Contar filtros activos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (estadoFilter !== 'todos') count++;
    if (pagadoFilter !== 'todos') count++;
    if (categoriaFilter) count++;
    if (tituloFilter) count++;
    if (docsFilter !== 'todos') count++;
    if (docBusqueda) count++;
    return count;
  }, [estadoFilter, pagadoFilter, categoriaFilter, tituloFilter, docsFilter, docBusqueda]);

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

      // Filtro de categoría
      const categoriaMatch = !categoriaFilter || expediente.categoria === categoriaFilter;

      // Filtro de título
      const tituloMatch = !tituloFilter || expediente.titulo === tituloFilter;

      // Filtro de documentos completados
      let docsMatch = true;
      const docs = expediente.documentos_requeridos || [];
      const totalDocs = docs.length;
      const docsAdj = docs.filter((d: any) => d.adjuntado).length;
      
      if (docsFilter === 'completos') docsMatch = totalDocs > 0 && docsAdj === totalDocs;
      else if (docsFilter === 'incompletos') docsMatch = totalDocs > 0 && docsAdj < totalDocs;
      else if (docsFilter === 'sin_docs') docsMatch = totalDocs === 0;

      // Búsqueda de documento específico
      let docBusquedaMatch = true;
      if (docBusqueda) {
        const search = docBusqueda.toLowerCase();
        docBusquedaMatch = docs.some((d: any) => d.nombre?.toLowerCase().includes(search));
      }

      return searchMatch && estadoMatch && pagadoMatch && categoriaMatch && tituloMatch && docsMatch && docBusquedaMatch;
    });
  }, [expedientes, searchTerm, estadoFilter, pagadoFilter, categoriaFilter, tituloFilter, docsFilter, docBusqueda]);

  // Expedientes paginados
  const paginatedExpedientes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredExpedientes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExpedientes, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredExpedientes.length / itemsPerPage) || 1;

  // Reset página al cambiar filtros
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter, pagadoFilter, categoriaFilter, tituloFilter, docsFilter, docBusqueda]);

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
    
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      setProcessProgress({ current: i + 1, total: ids.length });
      
      try {
        // Si es categoría y también se seleccionó título, actualizar ambos
        const updateData: Record<string, string> = { [massEditField]: massEditValue };
        if (massEditField === 'categoria' && massEditTitulo) {
          updateData.titulo = massEditTitulo;
        }
        
        const { error } = await supabase
          .from('procedimientos')
          .update(updateData)
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

  // Abrir modal de expediente
  const openExpedienteModal = (expediente: ExpedienteConCliente) => {
    setExpedienteModalData(expediente);
    setModalForm({
      titulo: expediente.titulo,
      concepto: expediente.concepto,
      categoria: expediente.categoria,
      estado: expediente.estado,
      presupuesto: expediente.presupuesto,
      nie_interesado: expediente.nie_interesado,
      nombre_interesado: expediente.nombre_interesado,
      expediente_referencia: expediente.expediente_referencia,
      fecha_presentacion: expediente.fecha_presentacion,
      fecha_resolucion: expediente.fecha_resolucion,
      notas: expediente.notas,
    });
    setShowExpedienteModal(true);
  };

  const saveExpedienteModal = async () => {
    if (!expedienteModalData) return;
    
    setSavingModal(true);
    try {
      const updates: any = {};
      if (modalForm.titulo !== undefined) updates.titulo = modalForm.titulo;
      if (modalForm.concepto !== undefined) updates.concepto = modalForm.concepto;
      if (modalForm.categoria !== undefined) updates.categoria = modalForm.categoria;
      if (modalForm.estado !== undefined) updates.estado = modalForm.estado;
      if (modalForm.presupuesto !== undefined) updates.presupuesto = modalForm.presupuesto;
      if (modalForm.nie_interesado !== undefined) updates.nie_interesado = modalForm.nie_interesado;
      if (modalForm.nombre_interesado !== undefined) updates.nombre_interesado = modalForm.nombre_interesado;
      if (modalForm.expediente_referencia !== undefined) updates.expediente_referencia = modalForm.expediente_referencia;
      if (modalForm.fecha_presentacion !== undefined) updates.fecha_presentacion = modalForm.fecha_presentacion || null;
      if (modalForm.fecha_resolucion !== undefined) updates.fecha_resolucion = modalForm.fecha_resolucion || null;
      if (modalForm.notas !== undefined) updates.notas = modalForm.notas;
      
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      
      const { error } = await supabase
        .from('procedimientos')
        .update(cleanUpdates)
        .eq('id', expedienteModalData.id);
      
      if (error) {
        throw new Error(`Error al guardar: ${error.message}`);
      }
      
      setShowExpedienteModal(false);
      setExpedienteModalData(null);
      await refetch();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSavingModal(false);
    }
  };

  const closeExpedienteModal = () => {
    setShowExpedienteModal(false);
    setExpedienteModalData(null);
    setModalForm({});
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

        {/* Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Botón filtros avanzados */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 flex items-center gap-2 ${
              showAdvancedFilters || activeFilterCount > 2
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros avanzados
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-purple-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Contador de filtros activos */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                {[
                  estadoFilter !== 'todos' && `Estado: ${estadoLabels[estadoFilter as EstadoProcedimiento]}`,
                  pagadoFilter !== 'todos' && (pagadoFilter === 'pagados' ? 'Pagados' : 'Pte. pago'),
                  categoriaFilter && `Cat: ${categoriasLabels[categoriaFilter] || categoriaFilter}`,
                  tituloFilter && `Título: ${tituloFilter}`,
                  docsFilter !== 'todos' && `Docs: ${docsFilter}`,
                  docBusqueda && `Doc: "${docBusqueda}"`,
                ].filter(Boolean).join(' • ')}
              </span>
            </div>
          )}

          {/* Botón limpiar filtros */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSearchTerm('');
                setEstadoFilter('todos');
                setPagadoFilter('todos');
                setCategoriaFilter('');
                setTituloFilter('');
                setDocsFilter('todos');
                setDocBusqueda('');
              }}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Limpiar todo
            </button>
          )}
        </div>

        {/* Panel de filtros avanzados desplegable */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro Categoría */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <FolderOpen className="w-3.5 h-3.5 inline mr-1" />
                  Categoría
                </label>
                <select
                  value={categoriaFilter}
                  onChange={(e) => { setCategoriaFilter(e.target.value); setTituloFilter(''); }}
                  className={`w-full px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200 appearance-none bg-white ${
                    categoriaFilter ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200'
                  }`}
                >
                  <option value="">Todas las categorías</option>
                  {categoriasPresentes.map(cat => (
                    <option key={cat} value={cat}>{categoriasLabels[cat] || cat}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Título */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <FileCheck className="w-3.5 h-3.5 inline mr-1" />
                  Título de expediente
                </label>
                <select
                  value={tituloFilter}
                  onChange={(e) => setTituloFilter(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200 appearance-none bg-white ${
                    tituloFilter ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200'
                  }`}
                >
                  <option value="">Todos los títulos</option>
                  {titulosParaFiltro.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Documentos completados */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <FileCheck className="w-3.5 h-3.5 inline mr-1" />
                  Documentos requeridos
                </label>
                <select
                  value={docsFilter}
                  onChange={(e) => setDocsFilter(e.target.value as typeof docsFilter)}
                  className={`w-full px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200 appearance-none bg-white ${
                    docsFilter !== 'todos' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200'
                  }`}
                >
                  <option value="todos">Todos</option>
                  <option value="completos">✓ Documentación completa</option>
                  <option value="incompletos">⚠ Documentación incompleta</option>
                  <option value="sin_docs">— Sin documentos requeridos</option>
                </select>
              </div>

              {/* Búsqueda de documento específico */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <Search className="w-3.5 h-3.5 inline mr-1" />
                  Buscar documento
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nombre del documento..."
                    value={docBusqueda}
                    onChange={(e) => setDocBusqueda(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200 pr-8 ${
                      docBusqueda ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200'
                    }`}
                  />
                  {docBusqueda && (
                    <button onClick={() => setDocBusqueda('')} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Resumen de docs filtrados */}
            {(docsFilter !== 'todos' || docBusqueda) && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-gray-500">
                  {filteredExpedientes.length} expediente{filteredExpedientes.length !== 1 ? 's' : ''} coinciden con los filtros de documentación
                </span>
              </div>
            )}
          </div>
        )}
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
                onClick={() => { setShowMassEdit(true); setMassEditField('estado'); setMassEditValue(''); setMassEditCategoria(''); setMassEditTitulo(''); }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cambiar estado
              </button>
              <button
                onClick={() => { setShowMassEdit(true); setMassEditField('categoria'); setMassEditValue(''); setMassEditCategoria(''); setMassEditTitulo(''); }}
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
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={massEditValue}
                    onChange={(e) => {
                      setMassEditValue(e.target.value);
                      setMassEditCategoria(e.target.value);
                      setMassEditTitulo('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Selecciona categoría...</option>
                    {Object.entries(categoriasLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                {massEditCategoria && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título (opcional)</label>
                    <select
                      value={massEditTitulo}
                      onChange={(e) => setMassEditTitulo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">No cambiar título</option>
                      {getTitulosPorCategoria(massEditCategoria).map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Si seleccionas un título, se cambiará junto con la categoría</p>
                  </div>
                )}
              </div>
            )}
            
            {massEditField === 'titulo' && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por categoría</label>
                  <select
                    value={massEditCategoria}
                    onChange={(e) => {
                      setMassEditCategoria(e.target.value);
                      setMassEditValue('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Todas las categorías</option>
                    {Object.entries(categoriasLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <select
                    value={massEditValue}
                    onChange={(e) => setMassEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Selecciona título...</option>
                    {getTitulosPorCategoria(massEditCategoria || undefined).map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
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

      {/* Info de paginación */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredExpedientes.length)}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredExpedientes.length)}</span> de <span className="font-medium">{filteredExpedientes.length}</span> expedientes
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Por página:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

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
              <th>Docs</th>
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
                <td colSpan={11} className="text-center py-8 text-gray-500">
                  No se encontraron expedientes con los filtros seleccionados
                </td>
              </tr>
            ) : (
              paginatedExpedientes.map((expediente) => {
                const isSelected = selectedIds.has(expediente.id);
                const isExpanded = expandedRows.has(expediente.id);
                const docs = expediente.documentos_requeridos || [];
                const totalDocs = docs.length;
                const docsAdj = docs.filter((d: any) => d.adjuntado).length;
                
                return (
                  <React.Fragment key={expediente.id}>
                    <tr className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''} ${isExpanded ? 'border-b-0' : ''}`}>
                      <td className="w-8" onClick={(e) => e.stopPropagation()}>
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
                      <td onClick={() => openExpedienteModal(expediente)}>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{expediente.cliente.nombre}</div>
                            <div className="text-sm text-gray-500">{expediente.cliente.nif || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td onClick={() => openExpedienteModal(expediente)}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{expediente.titulo}</span>
                            {expediente.categoria && <span className="badge badge-purple text-xs">{categoriasLabels[expediente.categoria] || expediente.categoria}</span>}
                          </div>
                          <div className="text-sm text-gray-500">{expediente.concepto}</div>
                          {expediente.expediente_referencia && (
                            <div className="text-xs text-gray-400">Ref: {expediente.expediente_referencia}</div>
                          )}
                        </div>
                      </td>
                      {/* Columna de Documentos con botón expandir */}
                      <td onClick={(e) => e.stopPropagation()}>
                        {totalDocs > 0 ? (
                          <button
                            onClick={() => toggleExpand(expediente.id)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                              docsAdj === totalDocs
                                ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                            }`}
                            title={`${docsAdj}/${totalDocs} documentos adjuntados. Click para ver detalle.`}
                          >
                            {docsAdj === totalDocs 
                              ? <FileCheck className="w-3.5 h-3.5" /> 
                              : <FileX className="w-3.5 h-3.5" />
                            }
                            {docsAdj}/{totalDocs}
                            {isExpanded 
                              ? <ChevronUp className="w-3 h-3" /> 
                              : <ChevronDown className="w-3 h-3" />
                            }
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td onClick={() => openExpedienteModal(expediente)}>
                        {expediente.fecha_presentacion ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {expediente.fecha_presentacion}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td onClick={() => openExpedienteModal(expediente)}>
                        <span className={`badge ${estadoBadges[expediente.estado]}`}>
                          {estadoLabels[expediente.estado]}
                        </span>
                      </td>
                      <td className="text-right" onClick={() => openExpedienteModal(expediente)}>
                        <span className="font-medium">{eur(expediente.presupuesto)}</span>
                      </td>
                      <td className="text-right" onClick={() => openExpedienteModal(expediente)}>
                        <span className={expediente.total_cobrado > 0 ? 'text-green-600' : 'text-gray-500'}>
                          {eur(expediente.total_cobrado)}
                        </span>
                      </td>
                      <td className="text-right" onClick={() => openExpedienteModal(expediente)}>
                        <span className={expediente.total_pendiente > 0 ? 'text-red-600' : 'text-green-600'}>
                          {eur(expediente.total_pendiente)}
                        </span>
                      </td>
                      <td className="text-center" onClick={() => openExpedienteModal(expediente)}>
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
                          <button
                            onClick={() => openExpedienteModal(expediente)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar expediente"
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
                        </div>
                      </td>
                    </tr>
                    {/* Fila expandida con documentos requeridos */}
                    {isExpanded && totalDocs > 0 && (
                      <tr className="bg-gray-50/80">
                        <td colSpan={11} className="px-4 py-3">
                          <div className="ml-8">
                            <div className="flex items-center gap-2 mb-2">
                              <FolderOpen className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-semibold text-gray-700">
                                Documentos requeridos ({docsAdj}/{totalDocs} completados)
                              </span>
                              {docsAdj === totalDocs && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Completo</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {docs.map((doc: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                                    doc.adjuntado
                                      ? 'bg-green-50 border-green-200 text-green-800'
                                      : 'bg-white border-gray-200 text-gray-700'
                                  }`}
                                >
                                  {doc.adjuntado 
                                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    : <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  }
                                  <span className={`truncate ${doc.adjuntado ? 'font-medium' : ''}`}>
                                    {doc.nombre}
                                  </span>
                                  {doc.notas && (
                                    <span className="text-xs text-gray-500 truncate ml-auto" title={doc.notas}>
                                      ({doc.notas})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Modal de Expediente Completo ── */}
      {showExpedienteModal && expedienteModalData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Editar Expediente</h3>
                <p className="text-sm text-gray-500">
                  Cliente: <span className="font-medium text-gray-700">{expedienteModalData.cliente.nombre}</span>
                  {expedienteModalData.cliente.nif && <span className="ml-2 text-gray-400">({expedienteModalData.cliente.nif})</span>}
                </p>
              </div>
              <button onClick={closeExpedienteModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Categoría y Título */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={modalForm.categoria || ''}
                    onChange={(e) => {
                      const newCat = e.target.value as CategoriaProcedimiento;
                      const available = getTitulosPorCategoria(newCat);
                      const valid = available.some(t => t.value === modalForm.titulo);
                      setModalForm({ ...modalForm, categoria: newCat, titulo: valid ? modalForm.titulo : '' });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Sin categoría</option>
                    {Object.entries(categoriasLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <select
                    value={modalForm.titulo || ''}
                    onChange={(e) => setModalForm({ ...modalForm, titulo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecciona título...</option>
                    {getTitulosPorCategoria(modalForm.categoria || undefined).map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                    {modalForm.titulo && !getTitulosPorCategoria(modalForm.categoria || undefined).some(t => t.value === modalForm.titulo) && (
                      <option value={modalForm.titulo}>{modalForm.titulo} (personalizado)</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input
                  type="text"
                  value={modalForm.concepto || ''}
                  onChange={(e) => setModalForm({ ...modalForm, concepto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Concepto del expediente"
                />
              </div>

              {/* Estado y Presupuesto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={modalForm.estado || ''}
                    onChange={(e) => setModalForm({ ...modalForm, estado: e.target.value as EstadoProcedimiento })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {Object.entries(estadoLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalForm.presupuesto || ''}
                    onChange={(e) => setModalForm({ ...modalForm, presupuesto: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Interesado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIE Interesado</label>
                  <input
                    type="text"
                    value={modalForm.nie_interesado || ''}
                    onChange={(e) => setModalForm({ ...modalForm, nie_interesado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="NIE"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Interesado</label>
                  <input
                    type="text"
                    value={modalForm.nombre_interesado || ''}
                    onChange={(e) => setModalForm({ ...modalForm, nombre_interesado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Nombre"
                  />
                </div>
              </div>

              {/* Referencia y Fechas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia expediente</label>
                <input
                  type="text"
                  value={modalForm.expediente_referencia || ''}
                  onChange={(e) => setModalForm({ ...modalForm, expediente_referencia: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Número de expediente"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha presentación</label>
                  <input
                    type="date"
                    value={modalForm.fecha_presentacion || ''}
                    onChange={(e) => setModalForm({ ...modalForm, fecha_presentacion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha resolución</label>
                  <input
                    type="date"
                    value={modalForm.fecha_resolucion || ''}
                    onChange={(e) => setModalForm({ ...modalForm, fecha_resolucion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={modalForm.notas || ''}
                  onChange={(e) => setModalForm({ ...modalForm, notas: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  rows={3}
                  placeholder="Notas adicionales..."
                />
              </div>

              {/* Info de pagos (solo lectura) */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Información de pagos</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cobrado:</span>
                    <span className={`ml-2 font-medium ${expedienteModalData.total_cobrado > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {eur(expedienteModalData.total_cobrado)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pendiente:</span>
                    <span className={`ml-2 font-medium ${expedienteModalData.total_pendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {eur(expedienteModalData.total_pendiente)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pagado:</span>
                    <span className={`ml-2 font-medium ${expedienteModalData.esta_pagado_totalmente ? 'text-green-600' : 'text-red-600'}`}>
                      {expedienteModalData.esta_pagado_totalmente ? 'Sí ✓' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl flex items-center justify-between">
              <button
                onClick={() => router.push(`/clientes/${expedienteModalData.cliente.id}`)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Ver ficha cliente
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeExpedienteModal}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveExpedienteModal}
                  disabled={savingModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {savingModal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </LayoutShell>
  );
}
