'use client';

import React, { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { toast } from 'sonner';
import { GastoForm } from '@/components/gasto-form';
import { Modal } from '@/components/modal';
import { useGastos } from '@/lib/hooks/use-gastos';
import type { Gasto } from '@/lib/supabase/types';
import { eur, monthLabel } from '@/lib/utils';
import { useHideSensitive } from '@/lib/hooks/use-hide-sensitive';
import { SensitiveToggle } from '@/components/sensitive-toggle';
import { StatsAccordion } from '@/components/stats-accordion';
import { FileText, Download, Eye, Edit, Trash2, Receipt, TrendingUp, TrendingDown, Calendar, DollarSign, ShoppingCart, Building, Zap, Car, Phone, Mail, CreditCard, Search, Filter, ChevronDown, X, Copy, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function GastosPage() {
  const { gastos, loading, error, createGasto, updateGasto, deleteGasto, uploadFactura } = useGastos();
  const { hidden: hideSensitive, toggle: toggleSensitive, mask } = useHideSensitive();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [mesFilter, setMesFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCategoriaFilter, setShowCategoriaFilter] = useState(false);
  const [showMesFilter, setShowMesFilter] = useState(false);

  // Filtrar gastos
  const filteredGastos = useMemo(() => {
    return gastos.filter(gasto => {
      const matchesSearch = searchQuery === '' || 
        gasto.proveedor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gasto.conceptos.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
        gasto.numero_factura?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gasto.notas?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategoria = categoriaFilter === '' || gasto.categoria === categoriaFilter;
      const matchesMes = mesFilter === '' || gasto.mes === mesFilter;

      return matchesSearch && matchesCategoria && matchesMes;
    });
  }, [gastos, searchQuery, categoriaFilter, mesFilter]);

  // Funciones de estadísticas
  const calcularGastoMesActual = () => {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth();
    const añoActual = fechaActual.getFullYear();
    const mesActualStr = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}`;
    
    return gastos
      .filter(gasto => gasto.mes === mesActualStr)
      .reduce((total, gasto) => total + gasto.importe_total, 0);
  };

  const calcularGastoMensualMedio = () => {
    const gastosPorMes = new Map<string, number>();
    
    gastos.forEach(gasto => {
      const current = gastosPorMes.get(gasto.mes) || 0;
      gastosPorMes.set(gasto.mes, current + gasto.importe_total);
    });
    
    if (gastosPorMes.size === 0) return 0;
    
    const total = Array.from(gastosPorMes.values()).reduce((sum, amount) => sum + amount, 0);
    return total / gastosPorMes.size;
  };

  const calcularGastoMesAnterior = () => {
    const fechaActual = new Date();
    const mesAnterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1);
    const mesAnteriorStr = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;
    
    return gastos
      .filter(gasto => gasto.mes === mesAnteriorStr)
      .reduce((total, gasto) => total + gasto.importe_total, 0);
  };

  const getCategoriaMasGastada = () => {
    const gastosPorCategoria = new Map<string, number>();
    
    gastos.forEach(gasto => {
      const current = gastosPorCategoria.get(gasto.categoria) || 0;
      gastosPorCategoria.set(gasto.categoria, current + gasto.importe_total);
    });
    
    let maxCategoria = '';
    let maxImporte = 0;
    
    gastosPorCategoria.forEach((importe, categoria) => {
      if (importe > maxImporte) {
        maxImporte = importe;
        maxCategoria = categoria;
      }
    });
    
    return { categoria: maxCategoria, importe: maxImporte };
  };

  const getVariacionMesAnterior = () => {
    const gastoActual = calcularGastoMesActual();
    const gastoAnterior = calcularGastoMesAnterior();
    
    if (gastoAnterior === 0) return 0;
    return ((gastoActual - gastoAnterior) / gastoAnterior) * 100;
  };

  const getCategoriaIcon = (categoria: string) => {
    const icons: Record<string, any> = {
      'Suministros': Zap,
      'Alquiler': Building,
      'Material': ShoppingCart,
      'Servicios': CreditCard,
      'Impuestos': FileText,
      'Marketing': Mail,
      'Transporte': Car,
      'Otros': DollarSign
    };
    return icons[categoria] || DollarSign;
  };

  const activeFiltersCount = [searchQuery, categoriaFilter, mesFilter].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery('');
    setCategoriaFilter('');
    setMesFilter('');
  };

  // Obtener meses únicos para filtros
  const mesesUnicos = useMemo(() => {
    const meses = [...new Set(gastos.map(g => g.mes))].sort().reverse();
    return meses.map(mes => ({ value: mes, label: monthLabel(mes) }));
  }, [gastos]);

  const categorias = [
    'Suministros',
    'Alquiler', 
    'Material',
    'Servicios',
    'Impuestos',
    'Marketing',
    'Transporte',
    'Otros'
  ];

  const categoriaOptions = categorias.map(cat => ({ value: cat, label: cat }));

  const handleCreate = () => {
    setEditingGasto(null);
    setIsModalOpen(true);
  };

  const handleEdit = (gasto: Gasto) => {
    setEditingGasto(gasto);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Gasto, 'id' | 'user_id' | 'created_at'>) => {
    try {
      console.log('Enviando datos del gasto:', data);
      
      if (editingGasto && editingGasto.id && editingGasto.id !== '') {
        console.log('Actualizando gasto existente:', editingGasto.id);
        await updateGasto(editingGasto.id, data);
      } else {
        console.log('Creando nuevo gasto');
        await createGasto(data);
      }
      
      console.log('Gasto guardado exitosamente');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error completo al guardar gasto:', error);
      
      // Mostrar error más detallado
      if (error instanceof Error) {
        toast.error(`Error al guardar el gasto: ${error.message}`);
      } else {
        toast.error('Error inesperado al guardar el gasto. Por favor, revisa la consola para más detalles.');
      }
    }
  };

  const handleDelete = async (gasto: Gasto) => {
    if (window.confirm(`¿Estás seguro de eliminar el gasto de ${gasto.proveedor}?`)) {
      try {
        await deleteGasto(gasto.id);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleViewFactura = (facturaUrl: string) => {
    window.open(facturaUrl, '_blank');
  };

  const handleDuplicate = (gasto: Gasto) => {
    const gastoForForm = {
      ...gasto,
      id: '',
      user_id: '',
      created_at: '',
      fecha: new Date().toISOString().split('T')[0],
      mes: new Date().toISOString().slice(0, 7),
      numero_factura: null,
      fecha_factura: null,
      factura_url: null,
    } as Gasto;
    setEditingGasto(gastoForForm);
    setIsModalOpen(true);
  };

  const mesActualStr = new Date().toISOString().slice(0, 7);

  const gastosRecurrentesPendientes = useMemo(() => {
    const plantillas = gastos.filter(g => g.es_recurrente && !g.gasto_plantilla_id);
    return plantillas.filter(plantilla => {
      return !gastos.some(
        g => g.gasto_plantilla_id === plantilla.id && g.mes === mesActualStr
      );
    });
  }, [gastos, mesActualStr]);

  const confirmarRecurrente = (gasto: Gasto) => {
    const gastoForForm = {
      ...gasto,
      id: '',
      user_id: '',
      created_at: '',
      fecha: new Date().toISOString().split('T')[0],
      mes: mesActualStr,
      numero_factura: null,
      fecha_factura: null,
      factura_url: null,
      gasto_plantilla_id: gasto.id,
    } as Gasto;
    setEditingGasto(gastoForForm);
    setIsModalOpen(true);
  };

  const PERIODICIDAD_LABEL: Record<string, string> = {
    semanal: 'Semanal', mensual: 'Mensual', bimestral: 'Bimestral',
    trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
  };

  if (loading) {
    return (
      <LayoutShell title="Gastos">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando gastos...</div>
        </div>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell title="Gastos">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell 
      title="Gastos" 
      description="Controla todos los gastos operativos de tu negocio. Categoriza, registra facturas y analiza los costos mensuales."
    >
      <div className="page-toolbar">
        <h2>Gestión de Gastos</h2>
        <button onClick={handleCreate} className="btn btn-primary">
          <FileText className="w-4 h-4" /> Nuevo Gasto
        </button>
      </div>

      {/* Estadísticas de Gastos */}
      <StatsAccordion title="Resumen de Gastos">
        <div className="dashboard-metrics" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 'var(--space-lg)' }}>
          <div className="metric-card metric-red">
            <TrendingDown className="metric-icon" />
            <div>
              <p className="metric-label">Gasto este mes</p>
              <p className="metric-value">{mask(eur(calcularGastoMesActual()))}</p>
            </div>
          </div>
          <div className="metric-card metric-blue">
            <Calendar className="metric-icon" />
            <div>
              <p className="metric-label">Media mensual</p>
              <p className="metric-value">{mask(eur(calcularGastoMensualMedio()))}</p>
            </div>
          </div>
          <div className="metric-card metric-purple">
            <ShoppingCart className="metric-icon" />
            <div>
              <p className="metric-label">Categoría top</p>
              <p className="metric-value" style={{ fontSize: '0.9rem' }}>{getCategoriaMasGastada().categoria || '—'}</p>
            </div>
          </div>
          <SensitiveToggle hidden={hideSensitive} onToggle={toggleSensitive} className="absolute top-2 right-2" />
        </div>
      </StatsAccordion>

      {/* ── Panel gastos recurrentes pendientes ── */}
      {gastosRecurrentesPendientes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-amber-800 text-sm">
              Gastos recurrentes pendientes de confirmar este mes ({gastosRecurrentesPendientes.length})
            </h3>
          </div>
          <div className="space-y-2">
            {gastosRecurrentesPendientes.map(gasto => (
              <div key={gasto.id} className="flex items-center justify-between bg-white border border-amber-100 rounded-lg px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-800 text-sm">{gasto.proveedor}</span>
                    <span className="text-gray-500 text-xs ml-2">{gasto.conceptos.join(', ')}</span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {PERIODICIDAD_LABEL[gasto.periodicidad || 'mensual']}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-700 text-sm">{eur(gasto.importe_total)}</span>
                  <button
                    onClick={() => confirmarRecurrente(gasto)}
                    className="btn btn-primary btn-sm flex items-center gap-1 text-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Confirmar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Búsqueda y Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        {/* Búsqueda Principal */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar gastos por proveedor, conceptos o factura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro de Categoría */}
          <div className="relative">
            <button
              onClick={() => setShowCategoriaFilter(!showCategoriaFilter)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                categoriaFilter 
                  ? 'border-purple-500 bg-purple-50 text-purple-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span>{categoriaFilter || 'Categoría'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showCategoriaFilter ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showCategoriaFilter && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 max-h-64 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-2">Seleccionar categoría</div>
                  {categorias.map(categoria => (
                    <button
                      key={categoria}
                      onClick={() => {
                        setCategoriaFilter(categoriaFilter === categoria ? '' : categoria);
                        setShowCategoriaFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        categoriaFilter === categoria 
                          ? 'bg-purple-50 text-purple-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {React.createElement(getCategoriaIcon(categoria), { className: "w-4 h-4" })}
                        <span>{categoria}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filtro de Mes */}
          <div className="relative">
            <button
              onClick={() => setShowMesFilter(!showMesFilter)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                mesFilter 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{mesFilter ? monthLabel(mesFilter) : 'Mes'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showMesFilter ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showMesFilter && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 max-h-64 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-2">Seleccionar mes</div>
                  {mesesUnicos.map(mes => (
                    <button
                      key={mes.value}
                      onClick={() => {
                        setMesFilter(mesFilter === mes.value ? '' : mes.value);
                        setShowMesFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        mesFilter === mes.value 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {mes.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botón Limpiar */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg border-2 border-red-300 bg-red-50 text-red-700 font-medium hover:bg-red-100 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <X className="w-4 h-4" />
                <span>Limpiar ({activeFiltersCount})</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="mb-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="font-medium">Filtros activos:</span> {activeFiltersCount} | 
          <span className="ml-2">Mostrando {filteredGastos.length} de {gastos.length} gastos</span>
        </div>
      )}

      {/* Tabla de Gastos */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Conceptos</th>
              <th>Categoría</th>
              <th>Importe</th>
              <th>Factura</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredGastos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  {searchQuery || categoriaFilter || mesFilter ? 'No se encontraron gastos con los filtros aplicados' : 'No hay gastos registrados'}
                </td>
              </tr>
            ) : (
              filteredGastos.map((gasto) => (
                <tr key={gasto.id}>
                  <td>{gasto.fecha}</td>
                  <td className="font-medium">{gasto.proveedor}</td>
                  <td className="max-w-xs">
                    <div className="text-sm">
                      {gasto.conceptos.slice(0, 2).map((concepto, idx) => (
                        <span key={idx} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                          {concepto}
                        </span>
                      ))}
                      {gasto.conceptos.length > 2 && (
                        <span className="text-gray-500 text-xs">+{gasto.conceptos.length - 2} más</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      gasto.categoria === 'Suministros' ? 'bg-blue-100 text-blue-800' :
                      gasto.categoria === 'Alquiler' ? 'bg-purple-100 text-purple-800' :
                      gasto.categoria === 'Material' ? 'bg-green-100 text-green-800' :
                      gasto.categoria === 'Servicios' ? 'bg-yellow-100 text-yellow-800' :
                      gasto.categoria === 'Impuestos' ? 'bg-red-100 text-red-800' :
                      gasto.categoria === 'Marketing' ? 'bg-pink-100 text-pink-800' :
                      gasto.categoria === 'Transporte' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      <div className="flex items-center gap-1">
                        {React.createElement(getCategoriaIcon(gasto.categoria), { className: "w-3 h-3 mr-1" })}
                        {gasto.categoria}
                      </div>
                    </span>
                  </td>
                  <td className="font-medium text-red-600">
                    <div className="flex items-center gap-1.5">
                      {eur(gasto.importe_total)}
                      {gasto.es_recurrente && (
                        <span title={`Recurrente ${PERIODICIDAD_LABEL[gasto.periodicidad || 'mensual']}`}>
                          <RefreshCw className="w-3 h-3 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {gasto.factura_url ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewFactura(gasto.factura_url!)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver factura"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={gasto.factura_url}
                          download
                          className="text-green-600 hover:text-green-800"
                          title="Descargar factura"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400">
                        <Receipt className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDuplicate(gasto)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Duplicar gasto"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(gasto)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(gasto)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGasto?.id && editingGasto.id !== '' ? 'Editar Gasto' : editingGasto ? 'Duplicar Gasto' : 'Nuevo Gasto'}
      >
        <GastoForm
          gasto={editingGasto || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          onUploadFactura={uploadFactura}
          isDuplicating={!!(editingGasto && editingGasto.id === '')}
        />
      </Modal>
    </LayoutShell>
  );
}
