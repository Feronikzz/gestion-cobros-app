'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutShell } from '@/components/layout-shell';
import { Modal } from '@/components/modal';
import { useFacturas } from '@/lib/hooks/use-facturas';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import { eur } from '@/lib/utils';
import type { TipoFactura, FacturaLinea, Factura } from '@/lib/supabase/types';
import { Plus, Trash2, Settings, FileText, Copy, Eye, Download } from 'lucide-react';

export function FacturasPageContent() {
  const searchParams = useSearchParams();
  const { facturas, emisor, loading, error, saveEmisor, createFactura, deleteFactura } = useFacturas();
  const { clientes } = useClientes();
  const { procedimientos } = useProcedimientos();

  const [showEmisorModal, setShowEmisorModal] = useState(false);
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [filterTipo, setFilterTipo] = useState('');

  // Emisor form
  const [emisorForm, setEmisorForm] = useState({
    nombre: emisor?.nombre || '',
    nif_cif: emisor?.nif_cif || '',
    direccion: emisor?.direccion || '',
    telefono: emisor?.telefono || '',
    email: emisor?.email || '',
  });

  // Factura form
  const emptyLinea: FacturaLinea = { descripcion: '', cantidad: 1, precio_unitario: 0, importe: 0 };
  const [facForm, setFacForm] = useState({
    cliente_id: '',
    procedimiento_id: '',
    tipo: 'normal' as TipoFactura,
    fecha: new Date().toISOString().slice(0, 10),
    receptor_nombre: '',
    receptor_nif: '',
    receptor_direccion: '',
    incluir_iva: true,
    iva_porcentaje: 21,
    incluir_irpf: false,
    irpf_porcentaje: 15,
    lineas: [{ ...emptyLinea }] as FacturaLinea[],
    factura_rectificada_id: '',
    motivo_rectificacion: '',
    notas: '',
  });

  const filteredFacturas = useMemo(() => {
    if (!filterTipo) return facturas;
    return facturas.filter(f => f.tipo === filterTipo);
  }, [facturas, filterTipo]);

  // Prellenar formulario desde parámetros de cobro
  useEffect(() => {
    const prellenarDesdeCobro = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const clienteId = searchParams.get('cliente_id');
      const clienteNombre = searchParams.get('cliente_nombre');
      const clienteNif = searchParams.get('cliente_nif');
      const clienteDireccion = searchParams.get('cliente_direccion');
      const importe = searchParams.get('importe');
      const concepto = searchParams.get('concepto');
      const fecha = searchParams.get('fecha');
      const ivaTipo = searchParams.get('iva_tipo');
      const ivaPorcentaje = searchParams.get('iva_porcentaje');
      const cobroId = searchParams.get('cobro_id');

      if (clienteId && clienteNombre) {
        const importeNum = parseFloat(importe || '0') || 0;
        const ivaPorc = parseFloat(ivaPorcentaje || '21') || 21;
        
        // Verificar si ya existe una factura para este cobro
        if (cobroId) {
          const { createClient } = await import('@/lib/supabase/client');
          // Solo crear el cliente de Supabase en el cliente
          const supabase = typeof window !== 'undefined' ? createClient() : null;
          if (!supabase) return;
          
          const { data: facturaExistente } = await supabase
            .from('facturas')
            .select('*')
            .eq('notas', `Factura generada desde cobro ID: ${cobroId}`)
            .single();
          
          if (facturaExistente) {
            alert('Ya existe una factura para este cobro. No se puede crear otra factura.');
            return;
          }
        }
        
        // Calcular importe base según tipo de IVA del cobro
        let baseImponible = importeNum;
        let incluirIva = true;
        
        if (ivaTipo === 'sin_iva') {
          baseImponible = importeNum;
          incluirIva = false;
        } else if (ivaTipo === 'iva_incluido') {
          // Si el IVA está incluido, hay que desglosarlo
          // Ejemplo: 50€ con 21% IVA incluido → Base 41,32€ + IVA 8,68€
          baseImponible = importeNum / (1 + ivaPorc / 100);
          incluirIva = true;
        } else if (ivaTipo === 'iva_sobre_precio') {
          // El IVA se suma al precio
          // Ejemplo: 50€ sin IVA → Base 50€ + IVA 10,50€ = Total 60,50€
          baseImponible = importeNum;
          incluirIva = true;
        }
        
        setFacForm({
          cliente_id: clienteId,
          procedimiento_id: '',
          tipo: 'normal',
          fecha: fecha || new Date().toISOString().slice(0, 10),
          receptor_nombre: clienteNombre,
          receptor_nif: clienteNif || '',
          receptor_direccion: clienteDireccion || '',
          incluir_iva: incluirIva,
          iva_porcentaje: ivaPorc,
          incluir_irpf: false,
          irpf_porcentaje: 15,
          lineas: [
            {
              descripcion: concepto || 'Servicio profesional',
              cantidad: 1,
              precio_unitario: baseImponible,
              importe: baseImponible
            }
          ],
          factura_rectificada_id: '',
          motivo_rectificacion: '',
          notas: cobroId ? `Factura generada desde cobro ID: ${cobroId}` : '',
        });
        setShowFacturaModal(true);
      }
    };

    prellenarDesdeCobro();
  }, [searchParams]);

  // Auto-fill receptor from client
  const handleClienteChange = (clienteId: string) => {
    const cli = clientes.find(c => c.id === clienteId);
    setFacForm(prev => ({
      ...prev,
      cliente_id: clienteId,
      receptor_nombre: cli?.nombre || '',
      receptor_nif: cli?.nif || '',
      receptor_direccion: cli?.direccion || '',
    }));
  };

  // Líneas calc
  const updateLinea = (idx: number, field: keyof FacturaLinea, value: string | number) => {
    const lineas = [...facForm.lineas];
    const l = { ...lineas[idx], [field]: value };
    l.importe = l.cantidad * l.precio_unitario;
    lineas[idx] = l;
    setFacForm(prev => ({ ...prev, lineas }));
  };

  const addLinea = () => setFacForm(prev => ({ ...prev, lineas: [...prev.lineas, { ...emptyLinea }] }));
  const removeLinea = (idx: number) => setFacForm(prev => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== idx) }));

  const [entradaPrecioTotal, setEntradaPrecioTotal] = useState(false);

  const handlePrecioChange = (idx: number, valor: number) => {
    if (entradaPrecioTotal && facForm.incluir_iva) {
      const base = Math.round((valor / (1 + facForm.iva_porcentaje / 100)) * 100) / 100;
      updateLinea(idx, 'precio_unitario', base);
    } else {
      updateLinea(idx, 'precio_unitario', valor);
    }
  };

  const getPrecioDisplay = (l: FacturaLinea) => {
    if (entradaPrecioTotal && facForm.incluir_iva) {
      return Math.round(l.precio_unitario * (1 + facForm.iva_porcentaje / 100) * 100) / 100;
    }
    return l.precio_unitario;
  };

  const baseImponible = Math.round(facForm.lineas.reduce((s, l) => s + l.importe, 0) * 100) / 100;
  const ivaImporte = facForm.incluir_iva ? Math.round(baseImponible * facForm.iva_porcentaje * 100) / 10000 : 0;
  const irpfImporte = facForm.incluir_irpf ? Math.round(baseImponible * facForm.irpf_porcentaje * 100) / 10000 : 0;
  const total = Math.round((baseImponible + ivaImporte - irpfImporte) * 100) / 100;

  // Generar número factura
  const nextNumero = () => {
    const year = new Date().getFullYear();
    const count = facturas.filter(f => f.numero.startsWith(`FAC-${year}`)).length + 1;
    return `FAC-${year}/${String(count).padStart(4, '0')}`;
  };

  const handleSaveEmisor = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEmisor({
      nombre: emisorForm.nombre,
      nif_cif: emisorForm.nif_cif,
      direccion: emisorForm.direccion || null,
      telefono: emisorForm.telefono || null,
      email: emisorForm.email || null,
    });
    setShowEmisorModal(false);
  };

  const handleCreateFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emisor) { alert('Configura primero los datos del emisor'); return; }

    await createFactura({
      numero: nextNumero(),
      cliente_id: facForm.cliente_id,
      procedimiento_id: facForm.procedimiento_id || null,
      tipo: facForm.tipo,
      fecha: facForm.fecha,
      emisor_nombre: emisor.nombre,
      emisor_nif: emisor.nif_cif,
      emisor_direccion: emisor.direccion,
      receptor_nombre: facForm.receptor_nombre,
      receptor_nif: facForm.receptor_nif || null,
      receptor_direccion: facForm.receptor_direccion || null,
      lineas: facForm.lineas,
      base_imponible: baseImponible,
      incluir_iva: facForm.incluir_iva,
      iva_porcentaje: facForm.iva_porcentaje,
      iva_importe: ivaImporte,
      incluir_irpf: facForm.incluir_irpf,
      irpf_porcentaje: facForm.irpf_porcentaje,
      irpf_importe: irpfImporte,
      total,
      factura_rectificada_id: facForm.factura_rectificada_id || null,
      motivo_rectificacion: facForm.motivo_rectificacion || null,
      notas: facForm.notas || null,
    });
    setShowFacturaModal(false);
    setFacForm({
      cliente_id: '', procedimiento_id: '', tipo: 'normal', fecha: new Date().toISOString().slice(0, 10),
      receptor_nombre: '', receptor_nif: '', receptor_direccion: '',
      incluir_iva: true, iva_porcentaje: 21, incluir_irpf: false, irpf_porcentaje: 15,
      lineas: [{ ...emptyLinea }],
      factura_rectificada_id: '', motivo_rectificacion: '', notas: '',
    });
  };

  const handleDelete = async (f: Factura) => {
    if (window.confirm(`¿Eliminar factura ${f.numero}?`)) {
      await deleteFactura(f.id);
    }
  };

  const openEmisorModal = () => {
    setEmisorForm({
      nombre: emisor?.nombre || '',
      nif_cif: emisor?.nif_cif || '',
      direccion: emisor?.direccion || '',
      telefono: emisor?.telefono || '',
      email: emisor?.email || '',
    });
    setShowEmisorModal(true);
  };

  const tipoBadge: Record<TipoFactura, string> = {
    normal: 'badge-green',
    rectificativa: 'badge-red',
    no_contable: 'badge-gray',
  };
  const tipoLabel: Record<TipoFactura, string> = {
    normal: 'Normal',
    rectificativa: 'Rectificativa',
    no_contable: 'No contable',
  };

  if (loading) return <LayoutShell title="Facturas"><div className="loading-state">Cargando...</div></LayoutShell>;
  if (error) return <LayoutShell title="Facturas"><div className="error-state">Error: {error}</div></LayoutShell>;

  return (
    <LayoutShell 
      title="Facturas" 
      description="Genera y gestiona facturas profesionales. Configura datos del emisor, crea facturas de clientes y controla la facturación."
    >
      <div className="page-toolbar">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={openEmisorModal} className="btn btn-secondary">
            <Settings className="w-4 h-4" /> Datos emisor
          </button>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="form-input search-select">
            <option value="">Todas</option>
            <option value="normal">Normal</option>
            <option value="rectificativa">Rectificativa</option>
            <option value="no_contable">No contable</option>
          </select>
        </div>
        <button onClick={() => setShowFacturaModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nueva factura
        </button>
      </div>

      {!emisor && (
        <div className="error-state" style={{ padding: '1rem', marginBottom: '1rem' }}>
          Configura los datos del emisor antes de crear facturas.
        </div>
      )}

      <p className="result-count">{filteredFacturas.length} facturas</p>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Base</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredFacturas.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">No hay facturas</td></tr>
            ) : (
              filteredFacturas.map(f => (
                <tr key={f.id}>
                  <td className="font-medium">{f.numero}</td>
                  <td>{f.fecha}</td>
                  <td>{f.receptor_nombre}</td>
                  <td><span className={`badge ${tipoBadge[f.tipo]}`}>{tipoLabel[f.tipo]}</span></td>
                  <td>{eur(f.base_imponible)}</td>
                  <td className="font-medium">{eur(f.total)}</td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => window.open(`/facturas/${f.id}`, '_blank')} className="action-btn action-view" title="Ver factura"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(f)} className="action-btn action-delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Datos emisor ── */}
      <Modal isOpen={showEmisorModal} onClose={() => setShowEmisorModal(false)} title="Datos del emisor">
        <form onSubmit={handleSaveEmisor} className="form-grid">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nombre / Razón social *</label>
              <input type="text" value={emisorForm.nombre} onChange={e => setEmisorForm({ ...emisorForm, nombre: e.target.value })} className="form-input" required />
            </div>
            <div>
              <label className="form-label">NIF / CIF *</label>
              <input type="text" value={emisorForm.nif_cif} onChange={e => setEmisorForm({ ...emisorForm, nif_cif: e.target.value })} className="form-input" required />
            </div>
            <div>
              <label className="form-label">Dirección</label>
              <input type="text" value={emisorForm.direccion} onChange={e => setEmisorForm({ ...emisorForm, direccion: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Teléfono</label>
              <input type="text" value={emisorForm.telefono} onChange={e => setEmisorForm({ ...emisorForm, telefono: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" value={emisorForm.email} onChange={e => setEmisorForm({ ...emisorForm, email: e.target.value })} className="form-input" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEmisorModal(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Nueva factura ── */}
      <Modal isOpen={showFacturaModal} onClose={() => setShowFacturaModal(false)} title="Nueva factura">
        <form onSubmit={handleCreateFactura} className="form-grid">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Tipo *</label>
              <select value={facForm.tipo} onChange={e => setFacForm({ ...facForm, tipo: e.target.value as TipoFactura })} className="form-input">
                <option value="normal">Normal</option>
                <option value="rectificativa">Rectificativa</option>
                <option value="no_contable">No contable (solo cliente)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Fecha *</label>
              <input type="date" value={facForm.fecha} onChange={e => setFacForm({ ...facForm, fecha: e.target.value })} className="form-input" required />
            </div>
            <div>
              <label className="form-label">Cliente *</label>
              <select value={facForm.cliente_id} onChange={e => handleClienteChange(e.target.value)} className="form-input" required>
                <option value="">Seleccionar...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          {facForm.tipo === 'rectificativa' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Factura a rectificar</label>
                <select value={facForm.factura_rectificada_id} onChange={e => setFacForm({ ...facForm, factura_rectificada_id: e.target.value })} className="form-input">
                  <option value="">Seleccionar...</option>
                  {facturas.filter(f => f.tipo === 'normal').map(f => <option key={f.id} value={f.id}>{f.numero}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Motivo rectificación</label>
                <input type="text" value={facForm.motivo_rectificacion} onChange={e => setFacForm({ ...facForm, motivo_rectificacion: e.target.value })} className="form-input" />
              </div>
            </div>
          )}

          <fieldset className="form-fieldset">
            <legend className="form-legend">Datos receptor</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Nombre *</label>
                <input type="text" value={facForm.receptor_nombre} onChange={e => setFacForm({ ...facForm, receptor_nombre: e.target.value })} className="form-input" required />
              </div>
              <div>
                <label className="form-label">NIF</label>
                <input type="text" value={facForm.receptor_nif} onChange={e => setFacForm({ ...facForm, receptor_nif: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="form-label">Dirección</label>
                <input type="text" value={facForm.receptor_direccion} onChange={e => setFacForm({ ...facForm, receptor_direccion: e.target.value })} className="form-input" />
              </div>
            </div>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">Líneas</legend>
            {facForm.lineas.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end mb-2">
                <div className="col-span-5">
                  {i === 0 && <label className="form-label">Descripción</label>}
                  <input type="text" value={l.descripcion} onChange={e => updateLinea(i, 'descripcion', e.target.value)} className="form-input" required />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="form-label">Cant.</label>}
                  <input type="number" min="1" value={l.cantidad} onChange={e => updateLinea(i, 'cantidad', parseInt(e.target.value) || 1)} className="form-input" />
                </div>
                <div className="col-span-2">
                  {i === 0 && (
                    <div className="flex items-center gap-1 mb-1">
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        {entradaPrecioTotal && facForm.incluir_iva ? 'P. total (c/IVA)' : 'Precio (sin IVA)'}
                      </label>
                    </div>
                  )}
                  <input type="number" step="0.01" min="0" value={getPrecioDisplay(l).toFixed(2)} onChange={e => handlePrecioChange(i, parseFloat(e.target.value) || 0)} className="form-input" />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="form-label">Importe</label>}
                  <input type="text" value={eur(l.importe)} className="form-input" readOnly />
                </div>
                <div className="col-span-1">
                  {facForm.lineas.length > 1 && (
                    <button type="button" onClick={() => removeLinea(i)} className="action-btn action-delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addLinea} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
              <Plus className="w-3.5 h-3.5" /> Añadir línea
            </button>
          </fieldset>

          <fieldset className="form-fieldset">
            <legend className="form-legend">Impuestos y totales</legend>
            <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded border border-blue-100">
              <input type="checkbox" id="entrada_precio_total" className="form-checkbox" checked={entradaPrecioTotal} onChange={e => setEntradaPrecioTotal(e.target.checked)} />
              <label htmlFor="entrada_precio_total" className="text-sm text-blue-800 cursor-pointer">
                Introducir precio con IVA incluido (el sistema calculará la base imponible automáticamente)
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={facForm.incluir_iva} onChange={e => setFacForm({ ...facForm, incluir_iva: e.target.checked })} className="form-checkbox" id="incluir_iva" />
                <label htmlFor="incluir_iva" className="form-label" style={{ marginBottom: 0 }}>Incluir IVA</label>
                {facForm.incluir_iva && (
                  <input type="number" min="0" max="100" value={facForm.iva_porcentaje} onChange={e => setFacForm({ ...facForm, iva_porcentaje: parseFloat(e.target.value) || 0 })} className="form-input" style={{ width: '80px' }} placeholder="%" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={facForm.incluir_irpf} onChange={e => setFacForm({ ...facForm, incluir_irpf: e.target.checked })} className="form-checkbox" id="incluir_irpf" />
                <label htmlFor="incluir_irpf" className="form-label" style={{ marginBottom: 0 }}>Incluir IRPF</label>
                {facForm.incluir_irpf && (
                  <input type="number" min="0" max="100" value={facForm.irpf_porcentaje} onChange={e => setFacForm({ ...facForm, irpf_porcentaje: parseFloat(e.target.value) || 0 })} className="form-input" style={{ width: '80px' }} placeholder="%" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Base imponible</label>
                <input type="text" value={eur(baseImponible)} className="form-input" readOnly />
              </div>
              {facForm.incluir_iva && (
                <div>
                  <label className="form-label">IVA ({facForm.iva_porcentaje}%)</label>
                  <input type="text" value={eur(ivaImporte)} className="form-input" readOnly />
                </div>
              )}
              {facForm.incluir_irpf && (
                <div>
                  <label className="form-label">IRPF (-{facForm.irpf_porcentaje}%)</label>
                  <input type="text" value={eur(irpfImporte)} className="form-input" readOnly />
                </div>
              )}
              <div>
                <label className="form-label">Total</label>
                <input type="text" value={eur(total)} className="form-input font-bold" readOnly />
              </div>
            </div>
          </fieldset>

          <div>
            <label className="form-label">Notas</label>
            <textarea value={facForm.notas} onChange={e => setFacForm({ ...facForm, notas: e.target.value })} className="form-input" rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowFacturaModal(false)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary"><FileText className="w-4 h-4" /> Crear factura</button>
          </div>
        </form>
      </Modal>
    </LayoutShell>
  );
}
