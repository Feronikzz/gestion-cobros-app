'use client';

import { useState, useMemo } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { Modal } from '@/components/modal';
import { ActividadForm } from '@/components/actividad-form';
import { ActividadMasivaForm } from '@/components/actividad-masiva-form';
import { ActividadCompleteDialog } from '@/components/actividad-complete-dialog';
import { ActividadTimeline } from '@/components/actividad-timeline';
import { ClienteFormV2 } from '@/components/cliente-form-v2';
import { useActividades } from '@/lib/hooks/use-actividades';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import type { Actividad, ActividadInsert, Cliente } from '@/lib/supabase/types';
import { Plus, Activity, Clock, AlertTriangle, Calendar, Users, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ActividadesPage() {
  const { actividades, loading, createActividad, updateActividad, deleteActividad, completeActividad, stats, refetch } = useActividades();
  const { clientes, updateCliente } = useClientes();
  const { procedimientos } = useProcedimientos();
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);
  // Client detail modal
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null);
  // Completion workflow
  const [completingActividad, setCompletingActividad] = useState<Actividad | null>(null);

  // Derivar nombres y contactos de clientes
  const clienteNombres = useMemo(() => {
    const map: Record<string, string> = {};
    clientes.forEach(c => { map[c.id] = [c.nombre, c.apellidos].filter(Boolean).join(' '); });
    return map;
  }, [clientes]);

  const clienteContactos = useMemo(() => {
    const map: Record<string, { telefono?: string | null; telefono2?: string | null; email?: string | null; direccion?: string | null }> = {};
    clientes.forEach(c => {
      map[c.id] = { telefono: c.telefono, telefono2: c.telefono2, email: c.email, direccion: c.direccion };
    });
    return map;
  }, [clientes]);

  if (loading) return <LayoutShell title="Actividades"><div className="loading-state">Cargando actividades...</div></LayoutShell>;

  return (
    <LayoutShell
      title="Actividades"
      description="Gestiona todas tus actividades: llamadas, visitas, tareas, reuniones y más. Control exhaustivo de acciones realizadas y pendientes."
    >
      <div className="page-toolbar">
        <h2>Panel de Actividades</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBulkModal(true)} className="btn btn-secondary flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Crear masiva
          </button>
          <button onClick={() => { setEditingActividad(null); setShowModal(true); }} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Nueva actividad
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-100 text-sm font-medium">Total actividades</div>
              <div className="text-2xl font-bold">{actividades.length}</div>
            </div>
            <Activity className="w-8 h-8 text-white/50" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-yellow-100 text-sm font-medium">Pendientes</div>
              <div className="text-2xl font-bold">{stats.pendientes}</div>
            </div>
            <Clock className="w-8 h-8 text-white/50" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-100 text-sm font-medium">Vencidas</div>
              <div className="text-2xl font-bold">{stats.vencidas}</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-white/50" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-100 text-sm font-medium">Para hoy</div>
              <div className="text-2xl font-bold">{stats.hoy}</div>
            </div>
            <Calendar className="w-8 h-8 text-white/50" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {actividades.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">No hay actividades registradas</p>
            <p className="text-sm text-gray-400">Empieza registrando llamadas, visitas, tareas o cualquier acción relacionada con tus clientes.</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary mt-4">
              <Plus className="w-4 h-4" /> Crear primera actividad
            </button>
          </div>
        ) : (
          <ActividadTimeline
            actividades={actividades}
            onComplete={(actId) => {
              const act = actividades.find(a => a.id === actId);
              if (act) setCompletingActividad(act);
            }}
            onEdit={(act) => { setEditingActividad(act); setShowModal(true); }}
            onDelete={(actId) => { if (window.confirm('¿Eliminar esta actividad?')) deleteActividad(actId); }}
            showCliente
            clienteNombres={clienteNombres}
            clienteContactos={clienteContactos}
            onClienteClick={(clienteId) => {
              const c = clientes.find(cl => cl.id === clienteId);
              if (c) { setViewingCliente(c); setShowClienteModal(true); }
            }}
          />
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingActividad(null); }} title={editingActividad ? 'Editar actividad' : 'Nueva actividad'} confirmClose>
        <ActividadForm
          actividad={editingActividad || undefined}
          onSubmit={async (data) => {
            if (editingActividad) {
              await updateActividad(editingActividad.id, data);
            } else {
              await createActividad(data);
            }
            setShowModal(false);
            setEditingActividad(null);
          }}
          onCancel={() => { setShowModal(false); setEditingActividad(null); }}
        />
      </Modal>

      {/* Modal completar actividad */}
      <Modal
        isOpen={!!completingActividad}
        onClose={() => setCompletingActividad(null)}
        title="Completar actividad"
      >
        {completingActividad && (
          <ActividadCompleteDialog
            actividad={completingActividad}
            clienteNombre={completingActividad.cliente_id ? clienteNombres[completingActividad.cliente_id] : undefined}
            onComplete={async (resultado) => {
              await completeActividad(completingActividad.id, resultado || undefined);
              setCompletingActividad(null);
            }}
            onCompleteAndSchedule={async (resultado, nuevaAct) => {
              await completeActividad(completingActividad.id, resultado || undefined);
              await createActividad(nuevaAct);
              setCompletingActividad(null);
            }}
            onCancel={() => setCompletingActividad(null)}
          />
        )}
      </Modal>

      {/* Modal ficha cliente */}
      <Modal
        isOpen={showClienteModal}
        onClose={() => { setShowClienteModal(false); setViewingCliente(null); }}
        title={viewingCliente ? `${[viewingCliente.nombre, viewingCliente.apellidos].filter(Boolean).join(' ')}` : 'Cliente'}
        size="wide"
        confirmClose
      >
        {viewingCliente && (
          <div>
            <div className="flex justify-end mb-3">
              <Link
                href={`/clientes/${viewingCliente.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                target="_blank"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir ficha completa
              </Link>
            </div>
            <ClienteFormV2
              cliente={viewingCliente}
              onSubmit={async (data, _docs, _proc) => {
                await updateCliente(viewingCliente.id, data);
                setShowClienteModal(false);
                setViewingCliente(null);
              }}
              onCancel={() => { setShowClienteModal(false); setViewingCliente(null); }}
              allowProcedimiento={false}
            />
          </div>
        )}
      </Modal>

      {/* Modal masiva */}
      <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Crear actividades masivas" size="wide" confirmClose>
        <ActividadMasivaForm
          clientes={clientes}
          procedimientos={procedimientos}
          onSubmit={async (data, clienteIds) => {
            for (const cid of clienteIds) {
              await createActividad({ ...data, cliente_id: cid });
            }
            await refetch();
            setShowBulkModal(false);
          }}
          onCancel={() => setShowBulkModal(false)}
        />
      </Modal>
    </LayoutShell>
  );
}
