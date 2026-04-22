// Sistema de auditoría/historial de cambios
import { createClient } from '@/lib/supabase/client';
import type { AuditLogInsert, TipoEntidad, TipoAccion, AuditLog } from '@/lib/supabase/types';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase && typeof window !== 'undefined') _supabase = createClient();
  return _supabase!;
}

/**
 * Registra una acción en el historial de auditoría
 */
export async function logAudit(
  entidad: TipoEntidad,
  accion: TipoAccion,
  data: {
    entidad_id?: string;
    entidad_nombre?: string;
    campo?: string;
    valor_anterior?: string | object;
    valor_nuevo?: string | object;
    descripcion?: string;
  }
): Promise<void> {
  try {
    const sb = getSupabase();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const insert: AuditLogInsert = {
      user_id: user.id,
      user_email: user.email || null,
      entidad,
      accion,
      entidad_id: data.entidad_id || null,
      entidad_nombre: data.entidad_nombre || null,
      campo: data.campo || null,
      valor_anterior: typeof data.valor_anterior === 'object' 
        ? JSON.stringify(data.valor_anterior) 
        : data.valor_anterior || null,
      valor_nuevo: typeof data.valor_nuevo === 'object' 
        ? JSON.stringify(data.valor_nuevo) 
        : data.valor_nuevo || null,
      descripcion: data.descripcion || null,
      ip_address: null, // Se puede añadir si es necesario
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    const { error } = await sb.from('audit_log').insert(insert);
    if (error) {
      console.error('Error inserting audit log:', error.message, error.details, error.hint);
    }
  } catch (err) {
    console.error('Error logging audit:', err);
  }
}

/**
 * Helpers específicos por entidad
 */

// Clientes
export const auditCliente = {
  crear: (id: string, nombre: string, data: object) => 
    logAudit('cliente', 'crear', { entidad_id: id, entidad_nombre: nombre, descripcion: `Nuevo cliente: ${nombre}`, valor_nuevo: data }),
  
  actualizar: (id: string, nombre: string, campo: string, anterior: unknown, nuevo: unknown) => 
    logAudit('cliente', 'actualizar', { 
      entidad_id: id, 
      entidad_nombre: nombre, 
      campo, 
      valor_anterior: String(anterior), 
      valor_nuevo: String(nuevo),
      descripcion: `Campo "${campo}" actualizado: "${anterior}" → "${nuevo}"`
    }),
  
  eliminar: (id: string, nombre: string) => 
    logAudit('cliente', 'eliminar', { entidad_id: id, entidad_nombre: nombre, descripcion: `Cliente eliminado: ${nombre}` }),
};

// Procedimientos/Expedientes
export const auditProcedimiento = {
  crear: (id: string, titulo: string, clienteNombre: string) => 
    logAudit('procedimiento', 'crear', { 
      entidad_id: id, 
      entidad_nombre: titulo, 
      descripcion: `Nuevo expediente: ${titulo} (${clienteNombre})` 
    }),
  
  actualizar: (id: string, titulo: string, campo: string, anterior: unknown, nuevo: unknown) => 
    logAudit('procedimiento', 'actualizar', { 
      entidad_id: id, 
      entidad_nombre: titulo, 
      campo,
      valor_anterior: String(anterior),
      valor_nuevo: String(nuevo),
      descripcion: `Expediente "${titulo}": ${campo} cambiado`
    }),
  
  eliminar: (id: string, titulo: string) => 
    logAudit('procedimiento', 'eliminar', { entidad_id: id, entidad_nombre: titulo, descripcion: `Expediente eliminado: ${titulo}` }),
  
  presentar: (id: string, titulo: string, referencia: string) => 
    logAudit('procedimiento', 'presentar', { 
      entidad_id: id, 
      entidad_nombre: titulo, 
      descripcion: `Expediente presentado: ${titulo} (${referencia})` 
    }),
  
  resolver: (id: string, titulo: string, estado: string) => 
    logAudit('procedimiento', 'resolver', { 
      entidad_id: id, 
      entidad_nombre: titulo, 
      descripcion: `Expediente resuelto: ${titulo} (${estado})` 
    }),
  
  docAdjuntar: (id: string, titulo: string, docNombre: string) => 
    logAudit('procedimiento', 'adjuntar', { 
      entidad_id: id, 
      entidad_nombre: titulo, 
      campo: 'documento',
      descripcion: `Documento adjuntado: ${docNombre}` 
    }),
  
  docDesadjuntar: (id: string, titulo: string, docNombre: string) => 
    logAudit('procedimiento', 'desadjuntar', { 
      entidad_id: id, 
      entidad_nombre: titulo, 
      campo: 'documento',
      descripcion: `Documento desmarcado: ${docNombre}` 
    }),
};

// Cobros
export const auditCobro = {
  crear: (id: string, importe: number, clienteNombre: string) => 
    logAudit('cobro', 'crear', { 
      entidad_id: id, 
      entidad_nombre: `${importe}€`, 
      descripcion: `Cobro registrado: ${importe}€ (${clienteNombre})` 
    }),
  
  eliminar: (id: string, importe: number, clienteNombre: string) => 
    logAudit('cobro', 'eliminar', { 
      entidad_id: id, 
      entidad_nombre: `${importe}€`, 
      descripcion: `Cobro eliminado: ${importe}€ (${clienteNombre})` 
    }),
};

// Gastos
export const auditGasto = {
  crear: (id: string, importe: number, concepto: string) => 
    logAudit('gasto', 'crear', { 
      entidad_id: id, 
      entidad_nombre: concepto, 
      descripcion: `Gasto registrado: ${concepto} (${importe}€)` 
    }),
  
  eliminar: (id: string, importe: number, concepto: string) => 
    logAudit('gasto', 'eliminar', { 
      entidad_id: id, 
      entidad_nombre: concepto, 
      descripcion: `Gasto eliminado: ${concepto} (${importe}€)` 
    }),
};

// Facturas
export const auditFactura = {
  crear: (id: string, numero: string, importe: number) => 
    logAudit('factura', 'crear', { 
      entidad_id: id, 
      entidad_nombre: numero, 
      descripcion: `Factura generada: ${numero} (${importe}€)` 
    }),
  
  eliminar: (id: string, numero: string) => 
    logAudit('factura', 'eliminar', { 
      entidad_id: id, 
      entidad_nombre: numero, 
      descripcion: `Factura eliminada: ${numero}` 
    }),
};

// Documentos subidos
export const auditDocumento = {
  subir: (id: string, nombre: string, clienteNombre: string) => 
    logAudit('documento', 'adjuntar', { 
      entidad_id: id, 
      entidad_nombre: nombre, 
      descripcion: `Documento subido: ${nombre} (${clienteNombre})` 
    }),
  
  eliminar: (id: string, nombre: string, clienteNombre: string) => 
    logAudit('documento', 'eliminar', { 
      entidad_id: id, 
      entidad_nombre: nombre, 
      descripcion: `Documento eliminado: ${nombre} (${clienteNombre})` 
    }),
};

// Recibís
export const auditRecibi = {
  crear: (id: string, numero: string, importe: number) => 
    logAudit('recibi', 'crear', { 
      entidad_id: id, 
      entidad_nombre: numero, 
      descripcion: `Recibí generado: ${numero} (${importe}€)` 
    }),
  
  eliminar: (id: string, numero: string) => 
    logAudit('recibi', 'eliminar', { 
      entidad_id: id, 
      entidad_nombre: numero, 
      descripcion: `Recibí eliminado: ${numero}` 
    }),
};

// Catálogo
export const auditCatalogo = {
  procedimientoCrear: (titulo: string) => 
    logAudit('catalogo', 'crear', { entidad_nombre: titulo, descripcion: `Procedimiento añadido al catálogo: ${titulo}` }),
  
  procedimientoActualizar: (titulo: string) => 
    logAudit('catalogo', 'actualizar', { entidad_nombre: titulo, descripcion: `Procedimiento actualizado en catálogo: ${titulo}` }),
  
  procedimientoEliminar: (titulo: string) => 
    logAudit('catalogo', 'eliminar', { entidad_nombre: titulo, descripcion: `Procedimiento eliminado del catálogo: ${titulo}` }),
  
  propagar: (titulo: string, count: number) => 
    logAudit('catalogo', 'actualizar', { 
      entidad_nombre: titulo, 
      descripcion: `Cambios propagados a ${count} expediente${count > 1 ? 's' : ''}: ${titulo}` 
    }),
};

/**
 * Obtiene el historial de auditoría con filtros
 */
export interface FiltrosAudit {
  fechaDesde?: string; // ISO date
  fechaHasta?: string; // ISO date
  entidad?: TipoEntidad;
  accion?: TipoAccion;
  limit?: number;
}

export async function getAuditLog(filtros: FiltrosAudit = {}): Promise<AuditLog[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  let query = sb
    .from('audit_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Aplicar filtros de fecha
  if (filtros.fechaDesde) {
    query = query.gte('created_at', filtros.fechaDesde);
  }
  if (filtros.fechaHasta) {
    query = query.lte('created_at', filtros.fechaHasta);
  }

  // Filtro de entidad
  if (filtros.entidad) {
    query = query.eq('entidad', filtros.entidad);
  }

  // Filtro de acción
  if (filtros.accion) {
    query = query.eq('accion', filtros.accion);
  }

  // Límite de resultados
  const limit = filtros.limit || 1000;
  query = query.limit(limit);

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching audit log:', error.message, error.details, error.hint, error.code);
    throw new Error(`Error al cargar historial: ${error.message}`);
  }

  return data || [];
}

/**
 * Obtiene resumen de actividad por día
 */
export async function getResumenPorDia(dias: number = 7): Promise<{fecha: string; count: number}[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const fechaDesde = new Date();
  fechaDesde.setDate(fechaDesde.getDate() - dias);

  const { data, error } = await sb
    .from('audit_log')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', fechaDesde.toISOString())
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  // Agrupar por día
  const grouped = new Map<string, number>();
  data.forEach((item: { created_at: string }) => {
    const fecha = item.created_at.split('T')[0];
    grouped.set(fecha, (grouped.get(fecha) || 0) + 1);
  });

  return Array.from(grouped.entries()).map(([fecha, count]) => ({ fecha, count }));
}
