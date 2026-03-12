// ─── Estados globales ─────────────────────────────────────
export type EstadoCliente = 'activo' | 'pendiente' | 'pagado' | 'archivado';
export type EstadoProcedimiento =
  | 'pendiente_presentar'
  | 'presentado'
  | 'pendiente_resolucion'
  | 'pendiente_recurso'
  | 'resuelto'
  | 'cerrado'
  | 'archivado';

// ─── Cliente ───────────────────────────────────────────────
export interface Cliente {
  id: string;
  user_id: string;
  nombre: string;
  nif: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  fecha_entrada: string;
  documento_tipo: string | null;
  documento_caducidad: string | null;
  estado: EstadoCliente;
  notas: string | null;
  created_at: string;
}

// ─── Procedimiento / Expediente ───────────────────────────
export interface Procedimiento {
  id: string;
  user_id: string;
  cliente_id: string;
  titulo: string;
  concepto: string;
  presupuesto: number;
  tiene_entrada: boolean;
  importe_entrada: number;
  // Datos del interesado (puede diferir del cliente)
  nie_interesado: string | null;
  nombre_interesado: string | null;
  // Expediente
  expediente_referencia: string | null;
  fecha_presentacion: string | null;
  fecha_resolucion: string | null;
  estado: EstadoProcedimiento;
  notas: string | null;
  created_at: string;
}

// ─── Documento adjunto ────────────────────────────────────
export interface Documento {
  id: string;
  user_id: string;
  procedimiento_id: string;
  nombre: string;
  tipo: string;            // justificante, notificacion, recurso, resolucion, otro
  archivo_url: string | null;
  notas: string | null;
  created_at: string;
}

// ─── Cobro ─────────────────────────────────────────────────
export interface Cobro {
  id: string;
  user_id: string;
  cliente_id: string;
  procedimiento_id: string | null;
  fecha_cobro: string;
  importe: number;
  metodo_pago: string;
  notas: string | null;
  created_at: string;
}

// ─── Reparto ───────────────────────────────────────────────
export interface Reparto {
  id: string;
  user_id: string;
  fecha: string;
  mes: string;
  categoria: string;
  destinatario: string;
  concepto: string;
  importe: number;
  notas: string | null;
  created_at: string;
}

// ─── Gasto ─────────────────────────────────────────────────
export interface Gasto {
  id: string;
  user_id: string;
  fecha: string;
  mes: string;
  categoria: string;
  proveedor: string;
  conceptos: string[];
  importe_total: number;
  factura_url: string | null;
  numero_factura: string | null;
  fecha_factura: string | null;
  notas: string | null;
  created_at: string;
}

// ─── Cierre mensual ────────────────────────────────────────
export interface CierreMensual {
  id: string;
  user_id: string;
  mes: string;
  arrastre_anterior: number;
  cobrado_mes: number;
  repartido_mes: number;
  saldo_final: number;
  estado: 'abierto' | 'cerrado';
  created_at: string;
}

// ─── Datos emisor (config facturación) ─────────────────────
export interface DatosEmisor {
  id: string;
  user_id: string;
  nombre: string;
  nif_cif: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  created_at: string;
}

// ─── Factura ───────────────────────────────────────────────
export type TipoFactura = 'normal' | 'rectificativa' | 'no_contable';

export interface Factura {
  id: string;
  user_id: string;
  numero: string;
  cliente_id: string;
  procedimiento_id: string | null;
  tipo: TipoFactura;
  fecha: string;
  // Datos emisor snapshot
  emisor_nombre: string;
  emisor_nif: string;
  emisor_direccion: string | null;
  // Datos receptor (copiados del cliente, editables)
  receptor_nombre: string;
  receptor_nif: string | null;
  receptor_direccion: string | null;
  // Líneas y totales
  lineas: FacturaLinea[];
  base_imponible: number;
  incluir_iva: boolean;
  iva_porcentaje: number;
  iva_importe: number;
  incluir_irpf: boolean;
  irpf_porcentaje: number;
  irpf_importe: number;
  total: number;
  // Rectificativa
  factura_rectificada_id: string | null;
  motivo_rectificacion: string | null;
  notas: string | null;
  created_at: string;
}

export interface FacturaLinea {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
}

// ─── Helpers TS para Insert / Update ───────────────────────
export type ClienteInsert = Omit<Cliente, 'id' | 'created_at'>;
export type ClienteUpdate = Partial<Omit<Cliente, 'id' | 'user_id' | 'created_at'>>;
export type ProcedimientoInsert = Omit<Procedimiento, 'id' | 'created_at'>;
export type ProcedimientoUpdate = Partial<Omit<Procedimiento, 'id' | 'user_id' | 'created_at'>>;
export type CobroInsert = Omit<Cobro, 'id' | 'created_at'>;
export type DocumentoInsert = Omit<Documento, 'id' | 'created_at'>;
export type FacturaInsert = Omit<Factura, 'id' | 'created_at'>;
export type DatosEmisorInsert = Omit<DatosEmisor, 'id' | 'created_at'>;

export interface Database {
  public: {
    Tables: {
      clientes: { Row: Cliente; Insert: ClienteInsert; Update: ClienteUpdate };
      procedimientos: { Row: Procedimiento; Insert: ProcedimientoInsert; Update: ProcedimientoUpdate };
      cobros: { Row: Cobro; Insert: CobroInsert; Update: Partial<Omit<Cobro, 'id' | 'user_id' | 'created_at'>> };
      documentos: { Row: Documento; Insert: DocumentoInsert; Update: Partial<Omit<Documento, 'id' | 'user_id' | 'created_at'>> };
      repartos: { Row: Reparto; Insert: Omit<Reparto, 'id' | 'created_at'>; Update: Partial<Omit<Reparto, 'id' | 'user_id' | 'created_at'>> };
      gastos: { Row: Gasto; Insert: Omit<Gasto, 'id' | 'created_at'>; Update: Partial<Omit<Gasto, 'id' | 'user_id' | 'created_at'>> };
      facturas: { Row: Factura; Insert: FacturaInsert; Update: Partial<Omit<Factura, 'id' | 'user_id' | 'created_at'>> };
      datos_emisor: { Row: DatosEmisor; Insert: DatosEmisorInsert; Update: Partial<Omit<DatosEmisor, 'id' | 'user_id' | 'created_at'>> };
      cierres_mensuales: { Row: CierreMensual; Insert: Omit<CierreMensual, 'id' | 'created_at'>; Update: Partial<Omit<CierreMensual, 'id' | 'user_id' | 'created_at'>> };
    };
  };
}
