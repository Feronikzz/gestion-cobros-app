'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutShell } from '@/components/layout-shell';
import { Modal } from '@/components/modal';
import { CobroForm } from '@/components/cobro-form';
import { ClienteNotas } from '@/components/cliente-notas';
import { createClient } from '@/lib/supabase/client';
import { eur } from '@/lib/utils';
import type { Cliente, Procedimiento, Cobro } from '@/lib/supabase/types';
import type { Documento, EstadoProcedimiento } from '@/lib/supabase/types';
import { ArrowLeft, Plus, Edit, Trash2, FileText, CreditCard, User, Paperclip, Upload, Receipt, Download, Activity, FileSignature, Printer } from 'lucide-react';
import { formatField } from '@/lib/utils/text';
import { ProcedimientoForm } from '@/components/procedimiento-form';
import { ActividadForm } from '@/components/actividad-form';
import { ActividadTimeline } from '@/components/actividad-timeline';
import { DesignacionRepresentante } from '@/components/designacion-representante';
import { RecibiGenerator } from '@/components/recibi-generator';
import { RecibiFormInline } from '@/components/recibi-form';
import { ClienteFormV2 } from '@/components/cliente-form-v2';
import { CarpetaLocalViewer } from '@/components/carpeta-local-viewer';
import { useActividades } from '@/lib/hooks/use-actividades';
import { useRecibis } from '@/lib/hooks/use-recibis';
import type { Actividad, Recibi, RecibiInsert, ClienteInsert, ClienteUpdate } from '@/lib/supabase/types';

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  // Solo crear el cliente de Supabase en el cliente
  const supabase = typeof window !== 'undefined' ? createClient() : null;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState(true);

  const [documentos, setDocumentos] = useState<Documento[]>([]);

  // Modales
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [showProcModal, setShowProcModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docProcId, setDocProcId] = useState<string | null>(null);
  const [editingProc, setEditingProc] = useState<Procedimiento | null>(null);
  const [showActividadModal, setShowActividadModal] = useState(false);
  const [showRecibiModal, setShowRecibiModal] = useState(false);
  const [showDesignacionModal, setShowDesignacionModal] = useState(false);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);
  const [viewRecibi, setViewRecibi] = useState<Recibi | null>(null);
  const [showEditClienteModal, setShowEditClienteModal] = useState(false);
  const [editingCobro, setEditingCobro] = useState<Cobro | null>(null);
  const [docsIdentidad, setDocsIdentidad] = useState<{tipo:string;numero:string;fecha_expedicion:string;fecha_caducidad:string;es_principal:boolean}[]>([]);

  // Hooks CRM
  const { actividades, createActividad, updateActividad, deleteActividad, completeActividad, stats: actStats } = useActividades(id);
  const { recibis, createRecibi, deleteRecibi, getNextNumero } = useRecibis(id);

  // Form procedimiento
  const defaultProcForm = {
    titulo: '', concepto: '', presupuesto: 0, tiene_entrada: false, importe_entrada: 0,
    nie_interesado: '', nombre_interesado: '',
    expediente_referencia: '', fecha_presentacion: '', fecha_resolucion: '',
    estado: 'pendiente_presentar' as EstadoProcedimiento, notas: '',
  };
  const [procForm, setProcForm] = useState(defaultProcForm);

  // Form documento
  const [docForm, setDocForm] = useState({ nombre: '', tipo: 'justificante', notas: '' });
  const [docFile, setDocFile] = useState<File | null>(null);

  const fetchData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const [{ data: cli }, { data: procs }, { data: cobs }, { data: docs }, { data: docsId }] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase.from('procedimientos').select('*').eq('cliente_id', id).order('created_at', { ascending: false }),
      supabase.from('cobros').select('*').eq('cliente_id', id).order('fecha_cobro', { ascending: false }),
      supabase.from('documentos').select('*').order('created_at', { ascending: false }),
      supabase.from('documentos_identidad').select('*').eq('cliente_id', id).order('created_at'),
    ]);
    setCliente(cli);
    setProcedimientos(procs || []);
    setCobros(cobs || []);
    setDocumentos(docs || []);
    setDocsIdentidad((docsId || []).map(d => ({
      tipo: d.tipo, numero: d.numero,
      fecha_expedicion: d.fecha_expedicion || '',
      fecha_caducidad: d.fecha_caducidad || '',
      es_principal: d.es_principal,
    })));
    setLoading(false);
  };

  useEffect(() => {
    // Solo ejecutar en el cliente cuando supabase esté disponible
    if (typeof window !== 'undefined' && supabase && id) {
      fetchData();
    }
  }, [supabase, id]);

  // Totales
  const procsAbiertas = useMemo(() => procedimientos.filter(p => p.estado !== 'cerrado' && p.estado !== 'archivado'), [procedimientos]);
  const totalPresupuesto = useMemo(() => procsAbiertas.reduce((s, p) => s + p.presupuesto, 0), [procsAbiertas]);
  const totalEntradas = useMemo(() => procedimientos.filter(p => p.tiene_entrada).reduce((s, p) => s + p.importe_entrada, 0), [procedimientos]);
  const totalCobrado = useMemo(() => cobros.reduce((s, c) => s + c.importe, 0), [cobros]);
  const totalPendiente = totalPresupuesto - totalCobrado;

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
  const estadoProcBadge: Record<EstadoProcedimiento, string> = {
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

  // Guardar procedimiento (recibe data directamente del ProcedimientoForm)
  const handleSaveProcData = async (formData: any) => {
    if (!supabase) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      ...formData,
      cliente_id: id,
      user_id: user.id,
    };

    if (editingProc) {
      const { cliente_id, user_id, ...updates } = payload;
      await supabase.from('procedimientos').update(updates).eq('id', editingProc.id);
      
      // Si se añade entrada en edición y no existía antes, crear cobro
      if (formData.tiene_entrada && formData.importe_entrada > 0 && !editingProc.tiene_entrada) {
        await supabase.from('cobros').insert({
          user_id: user.id,
          cliente_id: id,
          procedimiento_id: editingProc.id,
          fecha_cobro: new Date().toISOString().slice(0, 10),
          importe: formData.importe_entrada,
          metodo_pago: 'efectivo',
          notas: `Entrada del procedimiento: ${formData.titulo}`,
          iva_tipo: 'iva_incluido',
          iva_porcentaje: 21,
        });
      }
    } else {
      const { data: newProc } = await supabase.from('procedimientos').insert(payload).select().single();
      
      // Si tiene entrada, crear cobro automáticamente
      if (newProc && formData.tiene_entrada && formData.importe_entrada > 0) {
        await supabase.from('cobros').insert({
          user_id: user.id,
          cliente_id: id,
          procedimiento_id: newProc.id,
          fecha_cobro: new Date().toISOString().slice(0, 10),
          importe: formData.importe_entrada,
          metodo_pago: 'efectivo',
          notas: `Entrada del procedimiento: ${formData.titulo}`,
          iva_tipo: 'iva_incluido',
          iva_porcentaje: 21,
        });
      }
    }
    setShowProcModal(false);
    setEditingProc(null);
    setProcForm(defaultProcForm);
    fetchData();
  };

  // Actualizar datos del cliente
  const handleUpdateCliente = async (
    data: Omit<ClienteInsert, 'user_id'>,
    docs: { tipo: string; numero: string; fecha_expedicion: string; fecha_caducidad: string; es_principal: boolean }[],
    _proc: any
  ) => {
    if (!supabase || !id) return;
    
    const { user_id, ...updateData } = data as any;
    await supabase.from('clientes').update(updateData).eq('id', id);
    
    // Actualizar documentos de identidad si hay nuevos
    if (docs && docs.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Eliminar docs existentes y reinsertar
        await supabase.from('documentos_identidad').delete().eq('cliente_id', id);
        const docsToInsert = docs.filter(d => d.numero).map(d => ({
          user_id: user.id,
          cliente_id: id,
          tipo: d.tipo,
          numero: d.numero,
          fecha_expedicion: d.fecha_expedicion || null,
          fecha_caducidad: d.fecha_caducidad || null,
          es_principal: d.es_principal,
        }));
        if (docsToInsert.length > 0) {
          await supabase.from('documentos_identidad').insert(docsToInsert);
        }
      }
    }
    
    setShowEditClienteModal(false);
    fetchData();
  };

  const handleEditProc = (p: Procedimiento) => {
    setEditingProc(p);
    setProcForm({
      titulo: p.titulo, concepto: p.concepto, presupuesto: p.presupuesto,
      tiene_entrada: p.tiene_entrada, importe_entrada: p.importe_entrada,
      nie_interesado: p.nie_interesado || '', nombre_interesado: p.nombre_interesado || '',
      expediente_referencia: p.expediente_referencia || '',
      fecha_presentacion: p.fecha_presentacion || '', fecha_resolucion: p.fecha_resolucion || '',
      estado: p.estado, notas: p.notas || '',
    });
    setShowProcModal(true);
  };

  const handleDeleteProc = async (procId: string) => {
    if (!window.confirm('¿Eliminar este procedimiento?')) return;
    if (!supabase) return;
    
    await supabase.from('procedimientos').delete().eq('id', procId);
    fetchData();
  };

  // Guardar cobro (crear o actualizar)
  const handleSaveCobro = async (data: Omit<Cobro, 'id' | 'user_id' | 'created_at'>) => {
    if (!supabase) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (editingCobro) {
      await supabase.from('cobros').update(data).eq('id', editingCobro.id);
    } else {
      await supabase.from('cobros').insert({ ...data, user_id: user.id });
    }
    setShowCobroModal(false);
    setEditingCobro(null);
    fetchData();
  };

  const handleDeleteCobro = async (cobroId: string) => {
    if (!window.confirm('¿Eliminar este cobro?')) return;
    if (!supabase) return;
    
    await supabase.from('cobros').delete().eq('id', cobroId);
    fetchData();
  };

  const handleCreateFacturaFromCobro = (cobro: Cobro) => {
    // Redirigir a página de facturas con parámetros prellenados
    const params = new URLSearchParams({
      cliente_id: cobro.cliente_id,
      cliente_nombre: cliente?.nombre || '',
      cliente_nif: cliente?.nif || '',
      cliente_direccion: cliente?.direccion || '',
      importe: cobro.importe.toString(),
      concepto: cobro.notas || 'Cobro sin concepto específico',
      fecha: cobro.fecha_cobro,
      iva_tipo: cobro.iva_tipo,
      iva_porcentaje: cobro.iva_porcentaje.toString(),
      cobro_id: cobro.id,
    });
    
    window.open(`/facturas?${params.toString()}`, '_blank');
  };

  // Documentos
  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docProcId || !supabase) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let archivoUrl: string | null = null;

    // Subir archivo si existe
    if (docFile) {
      try {
        const fileName = `${user.id}/${docProcId}/${Date.now()}-${docFile.name}`;
        
        const { data, error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, docFile);

        if (uploadError) {
          console.error('Error al subir documento:', uploadError);
          // Si el bucket no existe, mostrar mensaje amigable
          if (uploadError.message?.includes('Bucket not found')) {
            alert('El bucket de documentos no está configurado en Supabase. El documento se guardará sin archivo. Por favor, crea el bucket "documentos" en la configuración de Storage de Supabase.');
          } else {
            throw uploadError;
          }
        } else {
          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('documentos')
            .getPublicUrl(fileName);
          archivoUrl = publicUrl;
        }
      } catch (error) {
        console.error('Error completo al subir documento:', error);
        alert('Error al subir el archivo. El documento se guardará sin archivo.');
      }
    }

    await supabase.from('documentos').insert({
      procedimiento_id: docProcId,
      nombre: formatField(docForm.nombre, 'general'),
      tipo: docForm.tipo,
      archivo_url: archivoUrl,
      notas: docForm.notas ? formatField(docForm.notas, 'general') : null,
      user_id: user.id,
    });
    setShowDocModal(false);
    setDocForm({ nombre: '', tipo: 'justificante', notas: '' });
    setDocFile(null);
    fetchData();
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    if (!supabase) return;
    
    await supabase.from('documentos').delete().eq('id', docId);
    fetchData();
  };

  const handleDownloadDoc = async (documento: Documento) => {
    if (!documento.archivo_url) {
      alert('Este documento no tiene archivo adjunto.');
      return;
    }

    try {
      // Extraer el nombre del archivo de la URL
      const url = new URL(documento.archivo_url);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];

      // Abrir la URL en una nueva pestaña para descargar
      const link = document.createElement('a');
      link.href = documento.archivo_url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al descargar documento:', error);
      alert('Error al descargar el documento. Por favor, inténtalo de nuevo.');
    }
  };

  const docsForProc = (procId: string) => documentos.filter(d => d.procedimiento_id === procId);

  // Calcular pendiente por procedimiento
  const getPendienteProcedimiento = (procId: string) => {
    const procedimiento = procedimientos.find(p => p.id === procId);
    if (!procedimiento) return 0;
    
    const cobrosDelProc = cobros.filter(c => c.procedimiento_id === procId);
    const totalCobrado = cobrosDelProc.reduce((s, c) => s + c.importe, 0);
    
    // Siempre contar la entrada como pagada si el procedimiento la tiene
    const importeEntrada = procedimiento.tiene_entrada ? procedimiento.importe_entrada : 0;
    
    // Verificar si la entrada ya está incluida en los cobros (creada automáticamente)
    const entradaYaCobrada = cobrosDelProc.some(c => 
      c.notas && c.notas.includes('Entrada del procedimiento')
    );
    
    // Calcular total pagado: cobros + entrada (si no está ya incluida)
    const totalPagado = totalCobrado + (procedimiento.tiene_entrada && !entradaYaCobrada ? importeEntrada : 0);
    
    return procedimiento.presupuesto - totalPagado;
  };

  if (loading) return <LayoutShell title="Cliente"><div className="loading-state">Cargando...</div></LayoutShell>;
  if (!cliente) return <LayoutShell title="Cliente"><div className="error-state">Cliente no encontrado</div></LayoutShell>;

  return (
    <LayoutShell 
      title={[cliente.nombre, cliente.apellidos].filter(Boolean).join(' ')}
      description="Gestiona toda la información del cliente. Controla expedientes, cobros, documentos y notas de seguimiento."
    >
      {/* Navegación */}
      <button onClick={() => router.push('/clientes')} className="back-link">
        <ArrowLeft className="w-4 h-4" /> Volver a clientes
      </button>

      {/* ── Ficha del cliente ── */}
      <div className="detail-card">
        <div className="detail-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User className="w-5 h-5" />
            <h2>Datos del cliente</h2>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowEditClienteModal(true)}>
            <Edit className="w-4 h-4" /> Editar datos
          </button>
        </div>
        <div className="detail-grid">
          <div><span className="detail-label">Nombre</span><span className="detail-value">{[cliente.nombre, cliente.apellidos].filter(Boolean).join(' ')}</span></div>
          <div><span className="detail-label">Fecha nacimiento</span><span className="detail-value">{cliente.fecha_nacimiento || (cliente.anio_nacimiento ? `Año ${cliente.anio_nacimiento}` : '—')}</span></div>
          {cliente.nacionalidad && <div><span className="detail-label">Nacionalidad</span><span className="detail-value">{cliente.nacionalidad}</span></div>}
          <div><span className="detail-label">Documento</span><span className="detail-value">{cliente.documento_tipo || '—'} {cliente.documento_numero || cliente.nif || ''} {cliente.documento_caducidad ? `(cad. ${cliente.documento_caducidad})` : ''}</span></div>
          <div><span className="detail-label">Teléfono</span><span className="detail-value">{cliente.telefono || '—'}</span></div>
          {cliente.telefono2 && <div><span className="detail-label">2º teléfono</span><span className="detail-value">{cliente.telefono2}</span></div>}
          <div><span className="detail-label">Email</span><span className="detail-value">{cliente.email || '—'}</span></div>
          <div><span className="detail-label">Dirección</span><span className="detail-value">{[cliente.direccion, cliente.codigo_postal, cliente.localidad, cliente.provincia].filter(Boolean).join(', ') || '—'}</span></div>
          <div><span className="detail-label">Fecha entrada</span><span className="detail-value">{cliente.fecha_entrada}</span></div>
          <div><span className="detail-label">Estado</span><span className={`badge badge-${cliente.estado === 'activo' ? 'green' : cliente.estado === 'pendiente' ? 'yellow' : cliente.estado === 'pagado' ? 'blue' : 'gray'}`}>{cliente.estado}</span></div>
          {cliente.notas && <div className="col-span-full"><span className="detail-label">Notas</span><span className="detail-value">{cliente.notas}</span></div>}
          {cliente.carpeta_local && (
            <div className="col-span-full">
              <span className="detail-label">Carpeta local</span>
              <a
                href={`file:///${cliente.carpeta_local.replace(/\\/g, '/')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-value text-blue-600 hover:text-blue-800 underline cursor-pointer inline-flex items-center gap-1 mb-2"
                title="Abrir carpeta local"
              >
                📁 {cliente.carpeta_local}
              </a>
              <div className="mt-2">
                <CarpetaLocalViewer basePath={cliente.carpeta_local} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Resumen económico ── */}
      <div className="dashboard-metrics" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="metric-card metric-amber">
          <div><p className="metric-label">Presupuesto total</p><p className="metric-value">{eur(totalPresupuesto)}</p></div>
        </div>
        <div className="metric-card metric-green">
          <div><p className="metric-label">Entradas pagadas</p><p className="metric-value">{eur(totalEntradas)}</p></div>
        </div>
        <div className="metric-card metric-blue">
          <div><p className="metric-label">Total cobrado</p><p className="metric-value">{eur(totalCobrado)}</p></div>
        </div>
        <div className={`metric-card ${totalPendiente > 0 ? 'metric-red' : 'metric-green'}`}>
          <div><p className="metric-label">Pendiente</p><p className="metric-value">{eur(totalPendiente)}</p></div>
        </div>
      </div>

      {/* ── Procedimientos / Expedientes ── */}
      <div className="section-block">
        <div className="section-header">
          <h3><FileText className="w-4 h-4 inline mr-1" /> Procedimientos / Expedientes</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingProc(null); setProcForm(defaultProcForm); setShowProcModal(true); }}>
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>

        {procedimientos.length === 0 ? (
          <p className="empty-state-inline">No hay procedimientos. Añade uno para gestionar presupuestos y expedientes.</p>
        ) : (
          <div className="proc-list">
            {procedimientos.map(p => {
              const docs = docsForProc(p.id);
              return (
                <div key={p.id} className="proc-card">
                  <div className="proc-card-header">
                    <h4>{p.titulo}</h4>
                    <div className="action-buttons">
                      <button onClick={() => { setDocProcId(p.id); setShowDocModal(true); }} className="action-btn action-view" title="Adjuntar documento"><Paperclip className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleEditProc(p)} className="action-btn action-edit"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteProc(p.id)} className="action-btn action-delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="proc-concepto">{p.concepto}</p>
                  <div className="proc-details">
                    {p.categoria && <span className="badge badge-purple text-xs">{p.categoria}</span>}
                    <span>Presupuesto: <strong>{eur(p.presupuesto)}</strong></span>
                    {p.tiene_entrada && <span>Entrada: <strong>{eur(p.importe_entrada)}</strong></span>}
                    <span>Pendiente: <strong className={getPendienteProcedimiento(p.id) > 0 ? "text-red-600" : "text-green-600"}>
                      {eur(getPendienteProcedimiento(p.id))}
                    </strong></span>
                    {p.nie_interesado && <span>NIE: {p.nie_interesado}</span>}
                    {p.nombre_interesado && <span>Interesado: {p.nombre_interesado}</span>}
                    {p.expediente_referencia && <span>Ref: {p.expediente_referencia}</span>}
                    {p.fecha_presentacion && <span>Presentado: {p.fecha_presentacion}</span>}
                    {p.fecha_resolucion && <span>Resolución: {p.fecha_resolucion}</span>}
                    <span className={`badge ${estadoProcBadge[p.estado]}`}>{estadoProcLabel[p.estado]}</span>
                  </div>
                  {/* Checklist de documentos */}
                  {p.documentos_requeridos && p.documentos_requeridos.length > 0 && (() => {
                    const total = p.documentos_requeridos!.length;
                    const adjuntados = p.documentos_requeridos!.filter(d => d.adjuntado).length;
                    const completo = adjuntados === total;
                    return (
                      <div className={`mt-2 p-2 rounded-lg border text-xs ${completo ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-center gap-1.5 font-medium mb-1">
                          <FileText className="w-3 h-3" />
                          Documentación: <span className={completo ? 'text-green-700' : 'text-amber-700'}>{adjuntados}/{total}</span>
                          {completo && <span className="text-green-600">✓ Completa</span>}
                        </div>
                        {!completo && (
                          <div className="text-gray-500">
                            Faltan: {p.documentos_requeridos!.filter(d => !d.adjuntado).map(d => d.nombre).join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {p.notas && <p className="proc-notas">{p.notas}</p>}
                  {docs.length > 0 && (
                    <div className="proc-docs">
                      {docs.map(d => (
                        <span key={d.id} className="proc-doc-tag">
                          <Paperclip className="w-3 h-3" /> {d.nombre} ({d.tipo})
                          <div className="proc-doc-actions">
                            {d.archivo_url && (
                              <button 
                                onClick={() => handleDownloadDoc(d)} 
                                className="proc-doc-download" 
                                title="Descargar archivo"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            )}
                            <button onClick={() => handleDeleteDoc(d.id)} className="proc-doc-remove" title="Eliminar">&times;</button>
                          </div>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Grid 2 columnas (desktop) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Cobros del cliente ── */}
      <div className="section-block">
        <div className="section-header">
          <h3><CreditCard className="w-4 h-4 inline mr-1" /> Cobros</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCobroModal(true)}>
            <Plus className="w-4 h-4" /> Nuevo cobro
          </button>
        </div>

        {cobros.length === 0 ? (
          <p className="empty-state-inline">No hay cobros registrados para este cliente.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Importe</th><th>Método</th><th>Notas</th><th>Acciones</th></tr></thead>
              <tbody>
                {cobros.map(c => (
                  <tr key={c.id}>
                    <td>{c.fecha_cobro}</td>
                    <td className="font-medium text-green-700">{eur(c.importe)}</td>
                    <td>{c.metodo_pago}</td>
                    <td className="subtle-text">{c.notas || '—'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setEditingCobro(c); setShowCobroModal(true); }} 
                          className="action-btn action-edit" 
                          title="Editar cobro"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleCreateFacturaFromCobro(c)} 
                          className="action-btn action-view" 
                          title="Crear factura"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCobro(c.id)} 
                          className="action-btn action-delete" 
                          title="Eliminar cobro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Actividades / CRM ── */}
      <div className="section-block">
        <div className="section-header">
          <h3><Activity className="w-4 h-4 inline mr-1" /> Actividades
            {actStats.pendientes > 0 && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{actStats.pendientes} pendientes</span>}
            {actStats.vencidas > 0 && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">{actStats.vencidas} vencidas</span>}
          </h3>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingActividad(null); setShowActividadModal(true); }}>
            <Plus className="w-4 h-4" /> Nueva actividad
          </button>
        </div>
        {actividades.length === 0 ? (
          <p className="empty-state-inline">No hay actividades registradas. Registra llamadas, visitas, tareas y más.</p>
        ) : (
          <ActividadTimeline
            actividades={actividades}
            onComplete={(actId) => { if (window.confirm('¿Marcar como completada?')) completeActividad(actId); }}
            onEdit={(act) => { setEditingActividad(act); setShowActividadModal(true); }}
            onDelete={(actId) => { if (window.confirm('¿Eliminar esta actividad?')) deleteActividad(actId); }}
          />
        )}
      </div>

      {/* ── Recibís ── */}
      <div className="section-block">
        <div className="section-header">
          <h3><Receipt className="w-4 h-4 inline mr-1" /> Recibís</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowRecibiModal(true)}>
            <Plus className="w-4 h-4" /> Nuevo recibí
          </button>
        </div>
        {recibis.length === 0 ? (
          <p className="empty-state-inline">No hay recibís generados para este cliente.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Nº</th><th>Fecha</th><th>Importe</th><th>Concepto</th><th>Pago</th><th>Acciones</th></tr></thead>
              <tbody>
                {recibis.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.numero}</td>
                    <td>{r.fecha}</td>
                    <td className="font-medium">{eur(r.importe)}</td>
                    <td className="subtle-text truncate max-w-[200px]">{r.concepto}</td>
                    <td>{r.forma_pago}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setViewRecibi(r)} className="action-btn action-view" title="Ver / Imprimir">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (window.confirm('¿Eliminar este recibí?')) deleteRecibi(r.id); }} className="action-btn action-delete" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Designación de representante ── */}
      <div className="section-block">
        <div className="section-header">
          <h3><FileSignature className="w-4 h-4 inline mr-1" /> Documentos legales</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowDesignacionModal(true)}>
            <FileSignature className="w-4 h-4" /> Designación de representante
          </button>
        </div>
        <p className="text-sm text-gray-500">Genera documentos legales utilizando los datos del cliente.</p>
      </div>

      {/* Sección de Notas */}
      <div className="section">
        <ClienteNotas clienteId={id!} />
      </div>

      </div>{/* cierre grid 2 columnas */}

      {/* ══════ MODALES (fuera del grid) ══════ */}

      {/* ── Modal: Cobro ── */}
      <Modal isOpen={showCobroModal} onClose={() => { setShowCobroModal(false); setEditingCobro(null); }} title={editingCobro ? 'Editar cobro' : 'Nuevo cobro'} confirmClose>
        <CobroForm cobro={editingCobro || undefined} clienteIdFijo={id} onSubmit={handleSaveCobro} onCancel={() => { setShowCobroModal(false); setEditingCobro(null); }} />
      </Modal>

      {/* ── Modal: Procedimiento ── */}
      <Modal isOpen={showProcModal} onClose={() => setShowProcModal(false)} title={editingProc ? 'Editar procedimiento' : 'Nuevo procedimiento'} confirmClose>
        <ProcedimientoForm
          procedimiento={editingProc || undefined}
          clienteId={id}
          onSubmit={handleSaveProcData}
          onCancel={() => setShowProcModal(false)}
        />
      </Modal>

      {/* ── Modal: Documento ── */}
      <Modal isOpen={showDocModal} onClose={() => setShowDocModal(false)} title="Adjuntar documento">
        <form onSubmit={handleSaveDoc} className="form-grid">
          <div>
            <label className="form-label">Nombre del documento *</label>
            <input type="text" value={docForm.nombre} onChange={e => setDocForm({ ...docForm, nombre: e.target.value })} className="form-input" required placeholder="Justificante de presentación" />
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <select value={docForm.tipo} onChange={e => setDocForm({ ...docForm, tipo: e.target.value })} className="form-input">
              <option value="justificante">Justificante</option>
              <option value="notificacion">Notificación</option>
              <option value="recurso">Recurso</option>
              <option value="resolucion">Resolución</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="form-label">Archivo</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                className="hidden"
                id="doc-file-input"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              />
              <label htmlFor="doc-file-input" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <div className="text-sm text-gray-600">
                  {docFile ? (
                    <div className="text-blue-600 font-medium">
                      {docFile.name} ({(docFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium text-gray-700">Click para subir archivo</div>
                      <div className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG, TXT (máx. 10MB)</div>
                    </div>
                  )}
                </div>
              </label>
              {docFile && (
                <button
                  type="button"
                  onClick={() => setDocFile(null)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 transition-colors"
                >
                  Quitar archivo
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea value={docForm.notas} onChange={e => setDocForm({ ...docForm, notas: e.target.value })} className="form-input" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => {
                setShowDocModal(false);
                setDocFile(null);
              }} 
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Upload className="w-4 h-4" /> Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Actividad ── */}
      <Modal isOpen={showActividadModal} onClose={() => { setShowActividadModal(false); setEditingActividad(null); }} title={editingActividad ? 'Editar actividad' : 'Nueva actividad'} confirmClose>
        <ActividadForm
          actividad={editingActividad || undefined}
          clienteId={id}
          onSubmit={async (data) => {
            if (editingActividad) {
              await updateActividad(editingActividad.id, data);
            } else {
              await createActividad(data);
            }
            setShowActividadModal(false);
            setEditingActividad(null);
          }}
          onCancel={() => { setShowActividadModal(false); setEditingActividad(null); }}
        />
      </Modal>

      {/* ── Modal: Nuevo Recibí ── */}
      <Modal isOpen={showRecibiModal} onClose={() => setShowRecibiModal(false)} title="Nuevo recibí" confirmClose>
        <RecibiFormInline
          clienteId={id}
          procedimientos={procedimientos}
          onSubmit={async (data: Omit<RecibiInsert, 'user_id'>) => {
            await createRecibi(data);
            setShowRecibiModal(false);
          }}
          onCancel={() => setShowRecibiModal(false)}
          getNextNumero={getNextNumero}
        />
      </Modal>

      {/* ── Modal: Ver Recibí (imprimir) ── */}
      <Modal isOpen={!!viewRecibi} onClose={() => setViewRecibi(null)} title={`Recibí ${viewRecibi?.numero || ''}`} size="wide">
        {viewRecibi && cliente && (
          <RecibiGenerator cliente={cliente} recibi={viewRecibi} />
        )}
      </Modal>

      {/* ── Modal: Designación de Representante ── */}
      <Modal isOpen={showDesignacionModal} onClose={() => setShowDesignacionModal(false)} title="Designación de Representante" size="wide">
        <DesignacionRepresentante cliente={cliente || undefined} onClose={() => setShowDesignacionModal(false)} />
      </Modal>

      {/* ── Modal: Editar datos del cliente ── */}
      <Modal isOpen={showEditClienteModal} onClose={() => setShowEditClienteModal(false)} title="Editar datos del cliente" size="wide" confirmClose>
        <ClienteFormV2
          cliente={cliente || undefined}
          onSubmit={handleUpdateCliente}
          onCancel={() => setShowEditClienteModal(false)}
          allowProcedimiento={false}
          initialDocs={docsIdentidad.length > 0 ? docsIdentidad : undefined}
        />
      </Modal>
    </LayoutShell>
  );
}
