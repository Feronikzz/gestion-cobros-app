'use client';

import React, { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { useCobros } from '@/lib/hooks/use-cobros';
import { useGastos } from '@/lib/hooks/use-gastos';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import { eur, monthLabel } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Calendar, Filter, Search, ChevronDown, X, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function FinanzasPage() {
  const { cobros } = useCobros();
  const { gastos } = useGastos();
  const { procedimientos } = useProcedimientos();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showYearFilter, setShowYearFilter] = useState(false);
  const [showMonthFilter, setShowMonthFilter] = useState(false);

  // Obtener años disponibles
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    
    // Añadir años de cobros
    cobros.forEach(cobro => {
      const year = new Date(cobro.fecha_cobro).getFullYear();
      years.add(year);
    });
    
    // Añadir años de gastos
    gastos.forEach(gasto => {
      const year = new Date(gasto.fecha).getFullYear();
      years.add(year);
    });
    
    // Asegurar que el año actual esté incluido
    years.add(currentYear);
    
    return Array.from(years).sort((a, b) => b - a);
  }, [cobros, gastos]);

  // Meses disponibles
  const months = [
    { value: 0, label: 'Enero' },
    { value: 1, label: 'Febrero' },
    { value: 2, label: 'Marzo' },
    { value: 3, label: 'Abril' },
    { value: 4, label: 'Mayo' },
    { value: 5, label: 'Junio' },
    { value: 6, label: 'Julio' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Septiembre' },
    { value: 9, label: 'Octubre' },
    { value: 10, label: 'Noviembre' },
    { value: 11, label: 'Diciembre' }
  ];

  // Filtrar por año y mes
  const filteredCobros = useMemo(() => {
    return cobros.filter(cobro => {
      const cobroDate = new Date(cobro.fecha_cobro);
      return cobroDate.getFullYear() === selectedYear && cobroDate.getMonth() === selectedMonth;
    });
  }, [cobros, selectedYear, selectedMonth]);

  const filteredGastos = useMemo(() => {
    return gastos.filter(gasto => {
      const gastoDate = new Date(gasto.fecha);
      return gastoDate.getFullYear() === selectedYear && gastoDate.getMonth() === selectedMonth;
    });
  }, [gastos, selectedYear, selectedMonth]);

  // Calcular totales
  const totalIngresos = useMemo(() => {
    return filteredCobros.reduce((total, cobro) => total + cobro.importe, 0);
  }, [filteredCobros]);

  const totalGastos = useMemo(() => {
    return filteredGastos.reduce((total, gasto) => total + gasto.importe_total, 0);
  }, [filteredGastos]);

  const balance = totalIngresos - totalGastos;

  // Calcular totales anuales
  const annualIngresos = useMemo(() => {
    return cobros.filter(cobro => new Date(cobro.fecha_cobro).getFullYear() === selectedYear)
      .reduce((total, cobro) => total + cobro.importe, 0);
  }, [cobros, selectedYear]);

  const annualGastos = useMemo(() => {
    return gastos.filter(gasto => new Date(gasto.fecha).getFullYear() === selectedYear)
      .reduce((total, gasto) => total + gasto.importe_total, 0);
  }, [gastos, selectedYear]);

  const annualBalance = annualIngresos - annualGastos;

  // Calcular presupuesto pendiente
  const presupuestoPendiente = useMemo(() => {
    return procedimientos
      .filter(p => p.estado !== 'cerrado' && p.estado !== 'archivado')
      .reduce((total, p) => total + p.presupuesto, 0);
  }, [procedimientos]);

  // Agrupar gastos por categoría
  const gastosPorCategoria = useMemo(() => {
    const categorias: Record<string, number> = {};
    filteredGastos.forEach(gasto => {
      categorias[gasto.categoria] = (categorias[gasto.categoria] || 0) + gasto.importe_total;
    });
    return Object.entries(categorias).sort(([, a], [, b]) => b - a);
  }, [filteredGastos]);

  // Agrupar cobros por método de pago
  const cobrosPorMetodo = useMemo(() => {
    const metodos: Record<string, number> = {};
    filteredCobros.forEach(cobro => {
      metodos[cobro.metodo_pago] = (metodos[cobro.metodo_pago] || 0) + cobro.importe;
    });
    return Object.entries(metodos).sort(([, a], [, b]) => b - a);
  }, [filteredCobros]);

  const activeFiltersCount = [selectedYear !== new Date().getFullYear() ? 'year' : '', selectedMonth !== new Date().getMonth() ? 'month' : ''].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(new Date().getMonth());
  };

  return (
    <LayoutShell 
      title="Finanzas" 
      description="Análisis financiero completo de tu negocio. Visualiza ingresos, gastos, balance y tendencias para tomar decisiones estratégicas."
    >
      <div className="page-toolbar">
        <h2>Resumen Financiero</h2>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-100 text-sm font-medium mb-1">Ingresos del mes</div>
              <div className="text-2xl font-bold">{eur(totalIngresos)}</div>
              <div className="text-green-100 text-xs mt-1">{filteredCobros.length} cobros</div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-100 text-sm font-medium mb-1">Gastos del mes</div>
              <div className="text-2xl font-bold">{eur(totalGastos)}</div>
              <div className="text-red-100 text-xs mt-1">{filteredGastos.length} gastos</div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className={`bg-gradient-to-r ${balance >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'} rounded-xl p-6 text-white shadow-lg`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`${balance >= 0 ? 'text-blue-100' : 'text-orange-100'} text-sm font-medium mb-1`}>Balance del mes</div>
              <div className="text-2xl font-bold">{eur(balance)}</div>
              <div className={`${balance >= 0 ? 'text-blue-100' : 'text-orange-100'} text-xs mt-1`}>
                {balance >= 0 ? 'Beneficio' : 'Pérdida'}
              </div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              {balance >= 0 ? <ArrowUpRight className="w-6 h-6 text-white" /> : <ArrowDownRight className="w-6 h-6 text-white" />}
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-purple-100 text-sm font-medium mb-1">Presupuesto pendiente</div>
              <div className="text-2xl font-bold">{eur(presupuestoPendiente)}</div>
              <div className="text-purple-100 text-xs mt-1">Por facturar</div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Resumen Anual */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Anual {selectedYear}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-green-800 text-sm font-medium">Ingresos anuales</div>
            <div className="text-green-900 text-xl font-bold">{eur(annualIngresos)}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 text-sm font-medium">Gastos anuales</div>
            <div className="text-red-900 text-xl font-bold">{eur(annualGastos)}</div>
          </div>
          <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4`}>
            <div className="text-blue-800 text-sm font-medium">Balance anual</div>
            <div className="text-blue-900 text-xl font-bold">{eur(annualBalance)}</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro de Año */}
          <div className="relative">
            <button
              onClick={() => setShowYearFilter(!showYearFilter)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                selectedYear !== new Date().getFullYear()
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{selectedYear}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showYearFilter ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showYearFilter && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2 max-h-60 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-2">Seleccionar año</div>
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedYear(year);
                        setShowYearFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        selectedYear === year 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filtro de Mes */}
          <div className="relative">
            <button
              onClick={() => setShowMonthFilter(!showMonthFilter)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all duration-200 ${
                selectedMonth !== new Date().getMonth()
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>{months[selectedMonth].label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showMonthFilter ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showMonthFilter && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2 max-h-60 overflow-y-auto">
                  <div className="text-xs font-medium text-gray-500 mb-2">Seleccionar mes</div>
                  {months.map(month => (
                    <button
                      key={month.value}
                      onClick={() => {
                        setSelectedMonth(month.value);
                        setShowMonthFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        selectedMonth === month.value 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {month.label}
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

      {/* Detalles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por Categoría */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gastos por Categoría</h3>
          {gastosPorCategoria.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay gastos en este período</p>
          ) : (
            <div className="space-y-3">
              {gastosPorCategoria.map(([categoria, total]) => (
                <div key={categoria} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{categoria}</span>
                  <span className="font-semibold text-red-600">{eur(total)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-red-600">{eur(totalGastos)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cobros por Método */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cobros por Método</h3>
          {cobrosPorMetodo.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay cobros en este período</p>
          ) : (
            <div className="space-y-3">
              {cobrosPorMetodo.map(([metodo, total]) => (
                <div key={metodo} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 capitalize">{metodo}</span>
                  <span className="font-semibold text-green-600">{eur(total)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-green-600">{eur(totalIngresos)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutShell>
  );
}
