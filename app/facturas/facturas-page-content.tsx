'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutShell } from '@/components/layout-shell';
import { Modal } from '@/components/modal';
import { useFacturas } from '@/lib/hooks/use-facturas';
import { useClientes } from '@/lib/hooks/use-clientes';
import { useProcedimientos } from '@/lib/hooks/use-procedimientos';
import { useCobros } from '@/lib/hooks/use-cobros';
import { eur } from '@/lib/utils';
import { toast } from 'sonner';
import Loading from '@/app/loading';
import type { TipoFactura, FacturaLinea, Factura } from '@/lib/supabase/types';
import { Plus, Trash2, Settings, FileText, Copy, Eye, Download, Archive } from 'lucide-react';
import { useConfirm } from '@/components/confirm-dialog';
import JSZip from 'jszip';

export function FacturasPageContent() {
  const { confirm } = useConfirm();
  const searchParams = useSearchParams();
  const { facturas, emisor, loading, error, saveEmisor, createFactura, deleteFactura } = useFacturas();
  const { clientes } = useClientes();
  const { procedimientos } = useProcedimientos();
  const { cobros } = useCobros();

  const [showEmisorModal, setShowEmisorModal] = useState(false);
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [sortBy, setSortBy] = useState<keyof Factura | null>('fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFacturas, setSelectedFacturas] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(false);

  // Emisor form
  const [emisorForm, setEmisorForm] = useState({
    nombre: emisor?.nombre || '',
    nif_cif: emisor?.nif_cif || '',
    direccion: emisor?.direccion || '',
    telefono: emisor?.telefono || '',
    email: emisor?.email || '',
    numero_inicial: emisor?.numero_inicial || 1,
  });

  // Factura form
  const emptyLinea: FacturaLinea = { descripcion: '', cantidad: 0, precio_unitario: 0, importe: 0 };
  const [facForm, setFacForm] = useState({
    cliente_id: '',
    procedimiento_id: '',
    cobro_id: '',
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
    let filtered = facturas;
    
    // Filtro por tipo
    if (filterTipo) {
      filtered = filtered.filter(f => f.tipo === filterTipo);
    }
    
    // Filtro por año
    if (filterYear) {
      filtered = filtered.filter(f => f.fecha.startsWith(filterYear));
    }
    
    // Filtro por mes
    if (filterMonth) {
      filtered = filtered.filter(f => f.fecha.startsWith(`${filterYear}-${filterMonth.padStart(2, '0')}`));
    }
    
    // Ordenamiento
    if (sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  }, [facturas, filterTipo, filterYear, filterMonth, sortBy, sortOrder]);

  // Prellenar formulario desde parámetros de cobro
  useEffect(() => {
    const prellenarDesdeCobro = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const clienteId = searchParams.get('cliente_id');
      const clienteNombre = searchParams.get('cliente_nombre');
      const clienteNif = searchParams.get('cliente_nif');
      const clienteDireccion = searchParams.get('cliente_direccion');
      const clienteCodigoPostal = searchParams.get('cliente_codigo_postal');
      const clienteLocalidad = searchParams.get('cliente_localidad');
      const clienteProvincia = searchParams.get('cliente_provincia');
      const clienteDocumentoTipo = searchParams.get('cliente_documento_tipo');
      const clienteDocumentoNumero = searchParams.get('cliente_documento_numero');
      const clientePasaporte = searchParams.get('cliente_pasaporte');
      const importe = searchParams.get('importe');
      const concepto = searchParams.get('concepto');
      const procedimientoNombre = searchParams.get('procedimiento_nombre');
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
          const supabase = typeof window !== 'undefined' ? createClient() : null;
          if (!supabase) return;
          
          const { data: facturaExistente } = await supabase
            .from('facturas')
            .select('*')
            .eq('cobro_id', cobroId)
            .single();
          
          if (facturaExistente) {
            toast.warning(`Ya existe la factura ${facturaExistente.numero} para este cobro. No se puede crear otra factura.`);
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
        
        // Construir dirección completa
        const direccionCompleta = [clienteDireccion, clienteCodigoPostal, clienteLocalidad, clienteProvincia]
          .filter(Boolean)
          .join(', ');
        
        // Construir documento con tipo
        let documentoConTipo = clienteNif || '';
        if (clienteDocumentoTipo && clienteDocumentoNumero) {
          documentoConTipo = `${clienteDocumentoTipo}: ${clienteDocumentoNumero}`;
        } else if (clientePasaporte) {
          documentoConTipo = `Pasaporte: ${clientePasaporte}`;
        }
        
        // Usar procedimiento como descripción si no hay concepto
        const descripcionFinal = concepto || procedimientoNombre || 'Servicio profesional';
        
        setFacForm({
          cliente_id: clienteId,
          procedimiento_id: '',
          cobro_id: cobroId || '',
          tipo: 'normal',
          fecha: fecha || new Date().toISOString().slice(0, 10),
          receptor_nombre: clienteNombre,
          receptor_nif: documentoConTipo,
          receptor_direccion: direccionCompleta,
          incluir_iva: incluirIva,
          iva_porcentaje: ivaPorc,
          incluir_irpf: false,
          irpf_porcentaje: 15,
          lineas: [
            {
              descripcion: descripcionFinal,
              cantidad: 0, // Por defecto 0 como solicitado
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
    // Si cantidad es 0, el importe es solo el precio unitario
    if (l.cantidad === 0) {
      l.importe = l.precio_unitario;
    } else {
      l.importe = l.cantidad * l.precio_unitario;
    }
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

  // Generar número factura con punto de partida configurable
  const nextNumero = () => {
    const year = new Date().getFullYear();
    const yearFacturas = facturas.filter(f => f.numero.startsWith(`FAC-${year}`));
    const count = yearFacturas.length;
    const inicio = emisor?.numero_inicial || 1;
    const nextNum = inicio + count;
    return `FAC-${year}/${String(nextNum).padStart(4, '0')}`;
  };

  const handleSaveEmisor = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEmisor({
      nombre: emisorForm.nombre,
      nif_cif: emisorForm.nif_cif,
      direccion: emisorForm.direccion || null,
      telefono: emisorForm.telefono || null,
      email: emisorForm.email || null,
      numero_inicial: emisorForm.numero_inicial || 1,
    });
    setShowEmisorModal(false);
  };

  const handleCreateFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emisor) { toast.warning('Configura primero los datos del emisor'); return; }

    await createFactura({
      numero: nextNumero(),
      cliente_id: facForm.cliente_id,
      procedimiento_id: facForm.procedimiento_id || null,
      cobro_id: facForm.cobro_id || null,
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
      cliente_id: '', procedimiento_id: '', cobro_id: '', tipo: 'normal', fecha: new Date().toISOString().slice(0, 10),
      receptor_nombre: '', receptor_nif: '', receptor_direccion: '',
      incluir_iva: true, iva_porcentaje: 21, incluir_irpf: false, irpf_porcentaje: 15,
      lineas: [{ ...emptyLinea }],
      factura_rectificada_id: '', motivo_rectificacion: '', notas: '',
    });
  };

  const handleDelete = async (f: Factura) => {
    if (await confirm({ title: 'Eliminar factura', message: `¿Eliminar factura ${f.numero}?`, variant: 'danger' })) {
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
      numero_inicial: emisor?.numero_inicial || 1,
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

  // Funciones de selección
  const toggleFacturaSelection = (id: string) => {
    setSelectedFacturas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const selectMonth = (month: string) => {
    const monthFacturas = filteredFacturas.filter(f => f.fecha.startsWith(`${filterYear}-${month.padStart(2, '0')}`));
    const ids = monthFacturas.map(f => f.id);
    setSelectedFacturas(new Set(ids));
  };

  const selectQuarter = (quarter: number) => {
    const months = quarter === 1 ? ['1', '2', '3'] : quarter === 2 ? ['4', '5', '6'] : quarter === 3 ? ['7', '8', '9'] : ['10', '11', '12'];
    const quarterFacturas = filteredFacturas.filter(f => months.some(m => f.fecha.startsWith(`${filterYear}-${m.padStart(2, '0')}`)));
    const ids = quarterFacturas.map(f => f.id);
    setSelectedFacturas(new Set(ids));
  };

  const clearSelection = () => setSelectedFacturas(new Set());

  // Función de descarga masiva agrupada por mes
  const handleBulkDownload = async () => {
    if (selectedFacturas.size === 0) {
      toast.warning('Selecciona al menos una factura');
      return;
    }

    const selectedFacturaData = facturas.filter(f => selectedFacturas.has(f.id));
    
    if (selectedFacturaData.length === 0) {
      toast.error('No se encontraron las facturas seleccionadas');
      return;
    }

    // Agrupar por mes
    const groupedByMonth = selectedFacturaData.reduce((acc, factura) => {
      const month = factura.fecha.substring(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = [];
      acc[month].push(factura);
      return acc;
    }, {} as Record<string, Factura[]>);

    toast.info(`Preparando descarga de ${selectedFacturas.size} facturas...`);

    // Abrir facturas en nuevas ventanas agrupadas por mes
    let delayCounter = 0;
    Object.entries(groupedByMonth).forEach(([month, facturas]) => {
      const [year, monthNum] = month.split('-');
      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      
      toast.info(`Abriendo ${facturas.length} facturas de ${monthName}...`);
      
      // Abrir cada factura con un delay incremental para evitar bloqueo del navegador
      facturas.forEach((factura, index) => {
        setTimeout(() => {
          const url = `/facturas/${factura.id}`;
          const newWindow = window.open(url, '_blank');
          
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            toast.error(`No se pudo abrir la factura ${factura.numero}. Verifica que tu navegador permita abrir ventanas emergentes.`);
          }
        }, delayCounter * 300); // 300ms entre cada factura
        delayCounter++;
      });
    });

    toast.success(`Se están abriendo ${selectedFacturas.size} facturas agrupadas por mes. Por favor, permite las ventanas emergentes en tu navegador.`);
  };

  // Función de ordenamiento
  const handleSort = (column: keyof Factura) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Cálculo de estadísticas
  const stats = useMemo(() => {
    const totalFacturado = filteredFacturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const totalBase = filteredFacturas.reduce((sum, f) => sum + (f.base_imponible || 0), 0);
    const totalIva = filteredFacturas.reduce((sum, f) => sum + (f.iva_importe || 0), 0);
    const totalIrpf = filteredFacturas.reduce((sum, f) => sum + (f.irpf_importe || 0), 0);
    
    // Calcular cobrado real basado en cobros asociados a facturas
    const cobrosIds = filteredFacturas.map(f => f.cobro_id).filter(Boolean) as string[];
    const cobrosAsociados = cobros.filter(c => cobrosIds.includes(c.id));
    const totalCobrado = cobrosAsociados.reduce((sum, c) => sum + c.importe, 0);
    
    // IVA a pagar (IVA facturado - IVA soportado en gastos)
    // Por ahora solo IVA facturado
    const ivaAPagar = totalIva;
    
    return {
      totalFacturado,
      totalBase,
      totalIva,
      totalIrpf,
      totalCobrado,
      ivaAPagar,
      pendienteCobro: totalFacturado - totalCobrado,
    };
  }, [filteredFacturas, cobros]);

  if (loading) return <Loading />;
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
          
          {/* Filtros de fecha */}
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="form-input search-select">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="form-input search-select">
            <option value="">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month.toString()}>
                {new Date(0, month - 1).toLocaleString('es-ES', { month: 'long' })}
              </option>
            ))}
          </select>
          
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="form-input search-select">
            <option value="">Todas</option>
            <option value="normal">Normal</option>
            <option value="rectificativa">Rectificativa</option>
            <option value="no_contable">No contable</option>
          </select>
          
          {/* Selección por mes/trimestre */}
          <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
            <span className="text-sm text-gray-600">Seleccionar:</span>
            <select onChange={e => selectMonth(e.target.value)} className="form-input search-select text-sm">
              <option value="">Mes...</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month.toString()}>
                  {new Date(0, month - 1).toLocaleString('es-ES', { month: 'long' })}
                </option>
              ))}
            </select>
            <select onChange={e => selectQuarter(parseInt(e.target.value))} className="form-input search-select text-sm">
              <option value="">Trimestre...</option>
              <option value="1">Q1 (Ene-Mar)</option>
              <option value="2">Q2 (Abr-Jun)</option>
              <option value="3">Q3 (Jul-Sep)</option>
              <option value="4">Q4 (Oct-Dic)</option>
            </select>
            {selectedFacturas.size > 0 && (
              <button onClick={clearSelection} className="text-sm text-red-600 hover:text-red-800">
                Limpiar ({selectedFacturas.size})
              </button>
            )}
          </div>
          
          {/* Estadísticas */}
          <button onClick={() => setShowStats(!showStats)} className="btn btn-secondary">
            <FileText className="w-4 h-4" /> Estadísticas
          </button>
        </div>
        <div className="flex items-center gap-3">
          {selectedFacturas.size > 0 && (
            <button onClick={handleBulkDownload} className="btn btn-secondary">
              <Archive className="w-4 h-4" /> Descargar ({selectedFacturas.size})
            </button>
          )}
          <button onClick={() => setShowFacturaModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Nueva factura
          </button>
        </div>
      </div>

      {!emisor && (
        <div className="error-state" style={{ padding: '1rem', marginBottom: '1rem' }}>
          Configura los datos del emisor antes de crear facturas.
        </div>
      )}

      {/* Panel de estadísticas */}
      {showStats && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Facturación</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Facturado</div>
              <div className="text-xl font-bold text-gray-900">{eur(stats.totalFacturado)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Base Imponible</div>
              <div className="text-xl font-bold text-gray-900">{eur(stats.totalBase)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">IVA Facturado</div>
              <div className="text-xl font-bold text-blue-600">{eur(stats.totalIva)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">IRPF</div>
              <div className="text-xl font-bold text-orange-600">{eur(stats.totalIrpf)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Cobrado</div>
              <div className="text-xl font-bold text-green-600">{eur(stats.totalCobrado)}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">IVA a Pagar</div>
              <div className="text-xl font-bold text-purple-600">{eur(stats.ivaAPagar)}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Pendiente de cobro:</span>
              <span className="font-semibold text-red-600">{eur(stats.pendienteCobro)}</span>
            </div>
          </div>
        </div>
      )}

      <p className="result-count">{filteredFacturas.length} facturas</p>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedFacturas.size === filteredFacturas.length && filteredFacturas.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFacturas(new Set(filteredFacturas.map(f => f.id)));
                    } else {
                      setSelectedFacturas(new Set());
                    }
                  }}
                />
              </th>
              <th onClick={() => handleSort('numero')} className="cursor-pointer hover:bg-gray-50">
                Número {sortBy === 'numero' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('fecha')} className="cursor-pointer hover:bg-gray-50">
                Fecha {sortBy === 'fecha' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('receptor_nombre')} className="cursor-pointer hover:bg-gray-50">
                Cliente {sortBy === 'receptor_nombre' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('tipo')} className="cursor-pointer hover:bg-gray-50">
                Tipo {sortBy === 'tipo' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('base_imponible')} className="cursor-pointer hover:bg-gray-50">
                Base {sortBy === 'base_imponible' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('total')} className="cursor-pointer hover:bg-gray-50">
                Total {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredFacturas.length === 0 ? (
              <tr><td colSpan={8} className="empty-state">No hay facturas</td></tr>
            ) : (
              filteredFacturas.map(f => (
                <tr key={f.id} className={selectedFacturas.has(f.id) ? 'bg-blue-50' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedFacturas.has(f.id)}
                      onChange={() => toggleFacturaSelection(f.id)}
                    />
                  </td>
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
            <div>
              <label className="form-label">Número inicial de facturas</label>
              <input 
                type="number" 
                min="1" 
                value={emisorForm.numero_inicial} 
                onChange={e => setEmisorForm({ ...emisorForm, numero_inicial: parseInt(e.target.value) || 1 })} 
                className="form-input" 
              />
              <p className="text-xs text-gray-500 mt-1">Punto de partida para numeración (ej: 1 para FAC-2026/0001)</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Número de factura</label>
              <div className="text-sm text-gray-500 mt-2">Auto: {nextNumero()}</div>
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
