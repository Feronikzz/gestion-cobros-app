export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export' | 'restore';
  entity_type: 'cliente' | 'cobro' | 'gasto' | 'procedimiento' | 'reparto' | 'factura' | 'cierre' | 'documento' | 'nota';
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  restored_at?: string;
  restored_by?: string;
}

export interface AuditLogInsert extends Omit<AuditLog, 'id' | 'created_at' | 'restored_at' | 'restored_by'> {}

export type AuditAction = AuditLog['action'];
export type EntityType = AuditLog['entity_type'];

export interface AuditFilter {
  user_email?: string;
  action?: AuditAction;
  entity_type?: EntityType;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface AuditStats {
  total_events: number;
  events_today: number;
  events_this_week: number;
  events_this_month: number;
  top_users: Array<{ email: string; count: number }>;
  top_entities: Array<{ type: string; count: number }>;
  recent_restores: number;
}
