import type { AuditAction, EntityType } from '@/lib/supabase/audit-types';

// Función helper para logging de auditoría
export async function logAuditEvent(
  action: AuditAction,
  entityType: EntityType,
  entityId?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  description?: string
) {
  try {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return;

    const response = await fetch('/api/audit-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        description,
      }),
    });

    if (!response.ok) {
      console.error('Failed to log audit event:', await response.text());
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

// Helper functions para acciones comunes
export const auditHelpers = {
  // Cliente
  logClienteCreated: (cliente: any) => 
    logAuditEvent('create', 'cliente', cliente.id, undefined, cliente, `Cliente creado: ${cliente.nombre}`),

  logClienteUpdated: (id: string, oldData: any, newData: any) =>
    logAuditEvent('update', 'cliente', id, oldData, newData, `Cliente actualizado: ${newData.nombre}`),

  logClienteDeleted: (cliente: any) =>
    logAuditEvent('delete', 'cliente', cliente.id, cliente, undefined, `Cliente eliminado: ${cliente.nombre}`),

  // Cobro
  logCobroCreated: (cobro: any) =>
    logAuditEvent('create', 'cobro', cobro.id, undefined, cobro, `Cobro creado: ${cobro.importe}€`),

  logCobroUpdated: (id: string, oldData: any, newData: any) =>
    logAuditEvent('update', 'cobro', id, oldData, newData, `Cobro actualizado: ${newData.importe}€`),

  logCobroDeleted: (cobro: any) =>
    logAuditEvent('delete', 'cobro', cobro.id, cobro, undefined, `Cobro eliminado: ${cobro.importe}€`),

  // Gasto
  logGastoCreated: (gasto: any) =>
    logAuditEvent('create', 'gasto', gasto.id, undefined, gasto, `Gasto creado: ${gasto.concepto}`),

  logGastoUpdated: (id: string, oldData: any, newData: any) =>
    logAuditEvent('update', 'gasto', id, oldData, newData, `Gasto actualizado: ${newData.concepto}`),

  logGastoDeleted: (gasto: any) =>
    logAuditEvent('delete', 'gasto', gasto.id, gasto, undefined, `Gasto eliminado: ${gasto.concepto}`),

  // Procedimiento
  logProcedimientoCreated: (procedimiento: any) =>
    logAuditEvent('create', 'procedimiento', procedimiento.id, undefined, procedimiento, `Procedimiento creado: ${procedimiento.titulo}`),

  logProcedimientoUpdated: (id: string, oldData: any, newData: any) =>
    logAuditEvent('update', 'procedimiento', id, oldData, newData, `Procedimiento actualizado: ${newData.titulo}`),

  logProcedimientoDeleted: (procedimiento: any) =>
    logAuditEvent('delete', 'procedimiento', procedimiento.id, procedimiento, undefined, `Procedimiento eliminado: ${procedimiento.titulo}`),

  // Login/Logout
  logLogin: (email: string) =>
    logAuditEvent('login', 'cliente' as EntityType, undefined, undefined, undefined, `Usuario inició sesión: ${email}`),

  logLogout: (email: string) =>
    logAuditEvent('logout', 'cliente' as EntityType, undefined, undefined, undefined, `Usuario cerró sesión: ${email}`),

  // View
  logPageView: (page: string) =>
    logAuditEvent('view', 'cliente' as EntityType, undefined, undefined, undefined, `Página visitada: ${page}`),

  // Export
  logExport: (entityType: EntityType, filters?: any) =>
    logAuditEvent('export', entityType, undefined, undefined, { filters }, `Exportación de ${entityType}`),
};
