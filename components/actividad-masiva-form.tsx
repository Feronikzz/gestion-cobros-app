'use client';

import { useState, useMemo } from 'react';
import type { Cliente, Procedimiento, TipoActividad, PrioridadActividad, EstadoProcedimiento, ActividadInsert } from '@/lib/supabase/types';
import { TIPO_LABELS, TIPO_ICONS, PRIORIDAD_COLORS } from '@/components/actividad-form';
import { Search, Users, FileText, CheckSquare, Square, Filter, X } from 'lucide-react';

interface ActividadMasivaFormProps {
  clientes: Cliente[];
  procedimientos: Procedimiento[];
  onSubmit: (data: Omit<ActividadInsert, 'user_id'>, clienteIds: string[]) => Promise<void>;
  onCancel: () => void;
}

const ESTADO_PROC_LABELS: Record<EstadoProcedimiento, string> = {
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

export function ActividadMasivaForm({ clientes, procedimientos, onSubmit, onCancel }: ActividadMasivaFormProps) {
  // ── Selection state ──
  const [selectedClienteIds, setSelectedClienteIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExpTipo, setFilterExpTipo] = useState('');
  const [filterExpEstado, setFilterExpEstado] = useState('');
  const [filterClienteEstado, setFilterClienteEstado] = useState('');

  // ── Activity form state ──
  const [form, setForm] = useState({
    tipo: 'tarea' as TipoActividad,
    titulo: '',
    descripcion: '',
    prioridad: 'media' as PrioridadActividad,
    fecha_programada: '',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'form'>('select');

  // ── Derived data ──
  const procByCliente = useMemo(() => {
    const map: Record<string, Procedimiento[]> = {};
    for (const p of procedimientos) {
      if (!map[p.cliente_id]) map[p.cliente_id] = [];
      map[p.cliente_id].push(p);
    }
    return map;
  }, [procedimientos]);

  // Unique expediente types (titulo) for filter
  const expTipos = useMemo(() => {
    const set = new Set<string>();
    procedimientos.forEach(p => set.add(p.titulo));
    return Array.from(set).sort();
  }, [procedimientos]);

  // Unique expediente estados
  const expEstados = useMemo(() => {
    const set = new Set<EstadoProcedimiento>();
    procedimientos.forEach(p => set.add(p.estado));
    return Array.from(set);
  }, [procedimientos]);

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      // Text search
      const matchSearch = !searchTerm ||
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nif?.toLowerCase().includes(searchTerm.toLowerCase());

      // Client estado filter
      const matchClienteEstado = !filterClienteEstado || c.estado === filterClienteEstado;

      // Expediente filters
      const procs = procByCliente[c.id] || [];
      const matchExpTipo = !filterExpTipo || procs.some(p => p.titulo === filterExpTipo);
      const matchExpEstado = !filterExpEstado || procs.some(p => p.estado === filterExpEstado);

      return matchSearch && matchClienteEstado && matchExpTipo && matchExpEstado;
    });
  }, [clientes, searchTerm, filterClienteEstado, filterExpTipo, filterExpEstado, procByCliente]);

  const toggleCliente = (id: string) => {
    setSelectedClienteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedClienteIds.size === filteredClientes.length) {
      setSelectedClienteIds(new Set());
    } else {
      setSelectedClienteIds(new Set(filteredClientes.map(c => c.id)));
    }
  };

  const selectByFilter = () => {
    setSelectedClienteIds(new Set(filteredClientes.map(c => c.id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClienteIds.size === 0) return;
    setLoading(true);
    try {
      const ids = Array.from(selectedClienteIds);
      await onSubmit({
        tipo: form.tipo,
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        estado: 'pendiente',
        prioridad: form.prioridad,
        fecha_programada: form.fecha_programada || null,
        fecha_completada: null,
        duracion_minutos: null,
        resultado: null,
        cliente_id: '', // placeholder, will be set per-client
        procedimiento_id: null,
      }, ids);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeFilters = [filterExpTipo, filterExpEstado, filterClienteEstado].filter(Boolean).length;

  return (
    <div style={{ maxHeight: '80vh', overflowY: 'auto' }} className="space-y-4">
      {step === 'select' ? (
        <>
          {/* ── Filters ── */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select value={filterClienteEstado} onChange={e => setFilterClienteEstado(e.target.value)} className="form-input text-sm py-1.5" style={{ width: 'auto' }}>
                <option value="">Estado cliente: Todos</option>
                <option value="activo">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="archivado">Archivado</option>
              </select>

              <select value={filterExpTipo} onChange={e => setFilterExpTipo(e.target.value)} className="form-input text-sm py-1.5" style={{ width: 'auto' }}>
                <option value="">Tipo expediente: Todos</option>
                {expTipos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select value={filterExpEstado} onChange={e => setFilterExpEstado(e.target.value)} className="form-input text-sm py-1.5" style={{ width: 'auto' }}>
                <option value="">Estado expediente: Todos</option>
                {expEstados.map(e => <option key={e} value={e}>{ESTADO_PROC_LABELS[e]}</option>)}
              </select>

              {activeFilters > 0 && (
                <button type="button" onClick={() => { setFilterExpTipo(''); setFilterExpEstado(''); setFilterClienteEstado(''); }} className="text-sm text-red-600 hover:text-red-700 px-2">
                  <X className="w-3 h-3 inline mr-1" />Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* ── Selection controls ── */}
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button type="button" onClick={toggleAll} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                {selectedClienteIds.size === filteredClientes.length && filteredClientes.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              {activeFilters > 0 && (
                <button type="button" onClick={selectByFilter} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  Seleccionar filtrados ({filteredClientes.length})
                </button>
              )}
            </div>
            <span className="text-sm text-gray-500">
              <strong>{selectedClienteIds.size}</strong> seleccionado{selectedClienteIds.size !== 1 ? 's' : ''} de {filteredClientes.length}
            </span>
          </div>

          {/* ── Client list ── */}
          <div className="space-y-1 max-h-[40vh] overflow-y-auto">
            {filteredClientes.map(c => {
              const procs = procByCliente[c.id] || [];
              const isSelected = selectedClienteIds.has(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleCliente(c.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}
                >
                  {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{[c.nombre, c.apellidos].filter(Boolean).join(' ')}</div>
                    {procs.length > 0 && (
                      <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {procs[0].titulo}{procs.length > 1 ? ` (+${procs.length - 1})` : ''}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.estado}
                  </span>
                </div>
              );
            })}
            {filteredClientes.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No hay clientes que coincidan con los filtros</div>
            )}
          </div>

          {/* ── Next button ── */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button type="button" onClick={onCancel} className="btn btn-secondary">Cancelar</button>
            <button
              type="button"
              onClick={() => setStep('form')}
              disabled={selectedClienteIds.size === 0}
              className="btn btn-primary"
            >
              Siguiente ({selectedClienteIds.size} cliente{selectedClienteIds.size !== 1 ? 's' : ''})
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ── Activity form ── */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>Se creará esta actividad para <strong>{selectedClienteIds.size}</strong> cliente{selectedClienteIds.size !== 1 ? 's' : ''}</span>
            <button type="button" onClick={() => setStep('select')} className="ml-auto text-blue-600 hover:text-blue-800 text-xs underline">Cambiar selección</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo rápido */}
            <div>
              <label className="form-label">Tipo de actividad</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {(Object.keys(TIPO_LABELS) as TipoActividad[]).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, tipo }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                      form.tipo === tipo
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {TIPO_ICONS[tipo]}
                    <span className="truncate w-full text-center">{TIPO_LABELS[tipo]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="form-label">Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="form-input" required placeholder="Ej: Recordatorio cita..." />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="form-input" rows={2} placeholder="Detalle de la actividad..." />
              </div>
              <div>
                <label className="form-label">Prioridad</label>
                <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value as PrioridadActividad })} className="form-input">
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div>
                <label className="form-label">Fecha programada</label>
                <input type="datetime-local" value={form.fecha_programada} onChange={e => setForm({ ...form, fecha_programada: e.target.value })} className="form-input" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button type="button" onClick={() => setStep('select')} className="btn btn-secondary">Atrás</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !form.titulo}>
                {loading ? 'Creando...' : `Crear ${selectedClienteIds.size} actividad${selectedClienteIds.size !== 1 ? 'es' : ''}`}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
