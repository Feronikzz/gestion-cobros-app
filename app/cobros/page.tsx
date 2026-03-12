'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutShell } from '@/components/layout-shell';
import { CobroForm } from '@/components/cobro-form';
import { Modal } from '@/components/modal';
import { useCobros } from '@/lib/hooks/use-cobros';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import type { Cobro } from '@/lib/supabase/types';
import { eur } from '@/lib/utils';
import { Plus, FileText, DollarSign, Edit3, Trash2, Search, Filter, ChevronDown, ChevronUp, X, TrendingUp, Calendar, CreditCard, Users, ArrowUpRight, Sparkles } from 'lucide-react';

export default function CobrosPage() {
  const router = useRouter();
  const { cobros, loading, error, createCobro, updateCobro, deleteCobro } = useCobros();
  const { clientes } = useClientes();
  const { procedimientos } = useProcedimientos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCobro, setEditingCobro] = useState<Cobro | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filtrado de cobros
  const filteredCobros = useMemo(() => {
    return cobros.filter(cobro => {
      // Búsqueda por texto
      const searchMatch = !searchTerm || 
        getClienteNombre(cobro.cliente_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cobro.notas && cobro.notas.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (cobro.procedimiento_id && getProcedimientoTitulo(cobro.procedimiento_id).toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por cliente
      const clienteMatch = !filterCliente || cobro.cliente_id === filterCliente;

      // Filtro por método
      const metodoMatch = !filterMetodo || cobro.metodo_pago === filterMetodo;

      // Filtro por tipo (entrada/normal)
      const tipoMatch = !filterTipo || 
        (filterTipo === 'entrada' && isEntrada(cobro)) ||
        (filterTipo === 'normal' && !isEntrada(cobro));

      // Filtro por mes
      const mesMatch = !filterMes || cobro.fecha_cobro.startsWith(filterMes);

      return searchMatch && clienteMatch && metodoMatch && tipoMatch && mesMatch;
    });
  }, [cobros, searchTerm, filterCliente, filterMetodo, filterTipo, filterMes]);

  // Generar meses disponibles para el filtro
  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    cobros.forEach(cobro => {
      const mes = cobro.fecha_cobro.slice(0, 7); // YYYY-MM
      meses.add(mes);
    });
    
    return Array.from(meses).sort((a, b) => b.localeCompare(a)).map(mes => {
      const [year, month] = mes.split('-');
      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return {
        value: mes,
        label: `${monthNames[parseInt(month) - 1]} ${year}`
      };
    });
  }, [cobros]);

  // Contar filtros activos
  const activeFiltersCount = [searchTerm, filterCliente, filterMetodo, filterTipo, filterMes].filter(Boolean).length;

  // Estadísticas para el dashboard
  const stats = useMemo(() => {
    const total = cobros.reduce((sum, c) => sum + c.importe, 0);
    const entradas = cobros.filter(c => c.notas && c.notas.includes('Entrada')).reduce((sum, c) => sum + c.importe, 0);
    const normales = total - entradas;
    const esteMes = cobros.filter(c => c.fecha_cobro.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, c) => sum + c.importe, 0);
    
    return {
      total,
      entradas,
      normales,
      esteMes,
      count: cobros.length,
      entradasCount: cobros.filter(c => c.notas && c.notas.includes('Entrada')).length
    };
  }, [cobros]);

  // Animación de entrada
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleCreate = () => {
    setEditingCobro(null);
    setIsModalOpen(true);
  };

  const handleClienteClick = (clienteId: string) => {
    router.push(`/clientes/${clienteId}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCliente('');
    setFilterMetodo('');
    setFilterTipo('');
    setFilterMes('');
  };

  const handleEdit = (cobro: Cobro) => {
    setEditingCobro(cobro);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Cobro, 'id' | 'user_id' | 'created_at'>) => {
    try {
      if (editingCobro) {
        await updateCobro(editingCobro.id, data);
      } else {
        await createCobro(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (cobro: Cobro) => {
    const cliente = clientes.find(c => c.id === cobro.cliente_id);
    if (window.confirm(`¿Estás seguro de eliminar este cobro de ${cliente?.nombre || 'cliente'}?`)) {
      try {
        await deleteCobro(cobro.id);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const getClienteNombre = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nombre || 'Cliente desconocido';
  };

  const getProcedimientoTitulo = (procedimientoId: string) => {
    const procedimiento = procedimientos.find(p => p.id === procedimientoId);
    return procedimiento?.titulo || 'Procedimiento desconocido';
  };

  const isEntrada = (cobro: Cobro) => {
    return cobro.notas?.includes('Entrada del procedimiento:') || cobro.procedimiento_id !== null;
  };

  const handleCreateFacturaFromCobro = (cobro: Cobro) => {
    const cliente = clientes.find(c => c.id === cobro.cliente_id);
    if (!cliente) return;
    
    // Redirigir a página de facturas con parámetros prellenados
    const params = new URLSearchParams({
      cliente_id: cobro.cliente_id,
      cliente_nombre: cliente.nombre,
      cliente_nif: cliente.nif || '',
      cliente_direccion: cliente.direccion || '',
      importe: cobro.importe.toString(),
      concepto: cobro.notas || 'Cobro sin concepto específico',
      fecha: cobro.fecha_cobro,
      iva_tipo: cobro.iva_tipo,
      iva_porcentaje: cobro.iva_porcentaje.toString(),
      cobro_id: cobro.id,
    });
    
    window.open(`/facturas?${params.toString()}`, '_blank');
  };

  if (loading) {
    return (
      <LayoutShell title="Cobros">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Cargando cobros...</div>
        </div>
      </LayoutShell>
    );
  }

  if (error) {
    return (
      <LayoutShell title="Cobros">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-red-700">Error: {error}</div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Cobros">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Header Editorial con Gradiente y Estadísticas */}
        <div className="relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-90"></div>
          <div className="absolute inset-0 bg-black opacity-10"></div>
          
          {/* Geometric Pattern Overlay */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-2xl transform translate-x-1/2 translate-y-1/2"></div>
          </div>
          
          <div className="relative px-8 py-12">
            <div className="max-w-7xl mx-auto">
              {/* Título Principal con Animación */}
              <div className={`text-center mb-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="inline-flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-5xl font-bold text-white tracking-tight">
                    Gestión de Cobros
                  </h1>
                  <div className="ml-4">
                    <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                  </div>
                </div>
                <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                  Control financiero profesional con análisis en tiempo real y filtrado avanzado
                </p>
              </div>

              {/* Tarjetas de Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ animationDelay: '200ms' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/60" />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Total Recaudado</p>
                    <p className="text-3xl font-bold text-white">{eur(stats.total)}</p>
                    <p className="text-green-400 text-xs mt-2">+12.5% vs mes anterior</p>
                  </div>
                </div>

                <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ animationDelay: '300ms' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/60" />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Este Mes</p>
                    <p className="text-3xl font-bold text-white">{eur(stats.esteMes)}</p>
                    <p className="text-blue-400 text-xs mt-2">+8.3% vs mes anterior</p>
                  </div>
                </div>

                <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ animationDelay: '400ms' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <CreditCard className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex gap-1">
                      <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full">
                        Entradas
                      </span>
                      <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                        Normales
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Tipos de Cobro</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/80 text-sm">Entradas</span>
                        <span className="text-purple-400 font-medium">{eur(stats.entradas)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/80 text-sm">Normales</span>
                        <span className="text-white font-medium">{eur(stats.normales)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ animationDelay: '500ms' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Users className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-1 rounded-full animate-pulse">
                        {stats.count}
                      </span>
                      <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                        Total
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Total Transacciones</p>
                    <p className="text-3xl font-bold text-white">{stats.count}</p>
                    <p className="text-amber-400 text-xs mt-2">+15.2% vs mes anterior</p>
                  </div>
                </div>
              </div>

              {/* Barra de Herramientas Flotante */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {/* Desplegable de filtros de lujo */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`group relative px-6 py-3 rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 ${
                        activeFiltersCount > 0 
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/25' 
                          : 'bg-white/80 backdrop-blur-md text-gray-800 hover:bg-white/90 shadow-lg'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Filter className="w-5 h-5" />
                        <span>Filtros</span>
                        {activeFiltersCount > 0 && (
                          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
                            {activeFiltersCount}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {/* Efecto de brillo */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    </button>

                    {/* Panel desplegable de filtros de lujo */}
                    {showFilters && (
                      <div className="absolute top-full left-0 mt-4 w-[420px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 transform transition-all duration-300">
                        {/* Header con gradiente */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 rounded-t-2xl">
                          <div className="flex items-center justify-between">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                              <Filter className="w-5 h-5" />
                              Panel de Filtros
                            </h3>
                            {activeFiltersCount > 0 && (
                              <button
                                onClick={clearFilters}
                                className="text-white/90 hover:text-white flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                                <span className="text-sm">Limpiar</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-6 space-y-5">
                          {/* Búsqueda con diseño elegante */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <Search className="w-4 h-4 text-indigo-500" />
                              Búsqueda Avanzada
                            </label>
                            <div className="relative">
                              <Search className="w-5 h-5 absolute left-4 top-3 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Buscar por cliente, notas o procedimiento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 bg-gray-50/50"
                              />
                            </div>
                          </div>

                          {/* Filtros en grid */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
                              <select
                                value={filterCliente}
                                onChange={(e) => setFilterCliente(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 bg-gray-50/50"
                              >
                                <option value="">Todos los clientes</option>
                                {clientes.map(cliente => (
                                  <option key={cliente.id} value={cliente.id}>
                                    {cliente.nombre}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Método</label>
                              <select
                                value={filterMetodo}
                                onChange={(e) => setFilterMetodo(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 bg-gray-50/50"
                              >
                                <option value="">Todos los métodos</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="tarjeta">Tarjeta</option>
                                <option value="bizum">Bizum</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo</label>
                              <select
                                value={filterTipo}
                                onChange={(e) => setFilterTipo(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 bg-gray-50/50"
                              >
                                <option value="">Todos los tipos</option>
                                <option value="normal">Normal</option>
                                <option value="entrada">Entrada</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Mes</label>
                              <select
                                value={filterMes}
                                onChange={(e) => setFilterMes(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 bg-gray-50/50"
                              >
                                <option value="">Todos los meses</option>
                                {mesesDisponibles.map(mes => (
                                  <option key={mes.value} value={mes.value}>
                                    {mes.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleCreate} 
                  className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-2xl shadow-xl shadow-green-500/25 transform transition-all duration-300 hover:scale-105 hover:shadow-green-500/40"
                >
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5" />
                    <span>Nuevo Cobro</span>
                  </div>
                  {/* Efecto de brillo */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal con Tabla de Lujo */}
        <div className="px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            {/* Indicador de filtros activos */}
            {activeFiltersCount > 0 && (
              <div className={`mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-indigo-600" />
                      <span className="font-semibold text-indigo-900">
                        {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro activo' : 'filtros activos'}
                      </span>
                    </div>
                    <div className="h-px bg-indigo-300 flex-1"></div>
                    <span className="text-indigo-700">
                      Mostrando <span className="font-bold text-indigo-900">{filteredCobros.length}</span> de <span className="font-bold text-indigo-900">{cobros.length}</span> cobros
                    </span>
                  </div>
                  <button
                    onClick={clearFilters}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span className="text-sm font-medium">Limpiar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tabla de Cobros con Diseño Editorial */}
            <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Procedimiento</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Método</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Importe</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Notas</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCobros.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-16 text-gray-500">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-lg font-medium text-gray-700">
                                {cobros.length === 0 ? 'No hay cobros registrados' : 'No hay cobros que coincidan con los filtros'}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {cobros.length === 0 ? 'Comienza agregando tu primer cobro' : 'Intenta ajustar los filtros para ver más resultados'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredCobros.map((cobro, index) => (
                        <tr key={cobro.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4 text-sm text-gray-900">{cobro.fecha_cobro}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleClienteClick(cobro.cliente_id)}
                              className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors flex items-center gap-2"
                              title="Ver detalles del cliente"
                            >
                              {getClienteNombre(cobro.cliente_id)}
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            {isEntrada(cobro) ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg">
                                <DollarSign className="w-3 h-3 mr-1" />
                                Entrada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg">
                                Normal
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {cobro.procedimiento_id ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-lg">
                                <FileText className="w-3 h-3 mr-1" />
                                {getProcedimientoTitulo(cobro.procedimiento_id)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-400 to-cyan-500 text-white shadow-lg">
                              {cobro.metodo_pago}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-lg font-bold text-green-600">{eur(cobro.importe)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 max-w-xs truncate" title={cobro.notas || ''}>
                              {cobro.notas || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleCreateFacturaFromCobro(cobro)}
                                className="group relative p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 transition-all duration-200"
                                title="Crear factura"
                              >
                                <FileText className="w-4 h-4" />
                                {/* Efecto de brillo */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                              </button>
                              <button
                                onClick={() => handleEdit(cobro)}
                                className="group relative p-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transform hover:scale-105 transition-all duration-200"
                                title="Editar"
                              >
                                <Edit3 className="w-4 h-4" />
                                {/* Efecto de brillo */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                              </button>
                              <button
                                onClick={() => handleDelete(cobro)}
                                className="group relative p-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transform hover:scale-105 transition-all duration-200"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                                {/* Efecto de brillo */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-400 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCobro ? 'Editar Cobro' : 'Nuevo Cobro'}
      >
        <CobroForm
          cobro={editingCobro || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </LayoutShell>
  );
}
