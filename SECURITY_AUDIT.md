# Auditoría de Seguridad y Protección de Datos

## Estado actual de la seguridad

### 1. Aislamiento de datos por usuario (RLS)

**Todas las tablas tienen Row Level Security habilitado** con políticas `auth.uid() = user_id`:

| Tabla | RLS | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|--------|--------|--------|--------|
| clientes | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| procedimientos | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| cobros | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| documentos | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| repartos | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| gastos | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| cierres_mensuales | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| datos_emisor | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| facturas | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| cliente_notas | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| catalogo_categorias | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| catalogo_procedimientos | ✅ | ✅ own | ✅ own | ✅ own | ✅ own |
| catalogo_documentos_requeridos | ✅ | ✅ via FK | ✅ via FK | ✅ via FK | ✅ via FK |
| audit_log | ✅ | ✅ own | ✅ own | — | — |

**Resultado:** Ningún usuario puede ver, modificar o eliminar datos de otro usuario.

### 2. Aislamiento de archivos (Storage)

Los archivos se suben con path `{user_id}/{...}/{filename}`:

| Bucket | Políticas | Aislamiento |
|--------|-----------|-------------|
| documentos | ✅ INSERT/SELECT/UPDATE/DELETE por user_id | ✅ Carpeta por usuario |
| facturas | ✅ INSERT/SELECT/UPDATE/DELETE por user_id | ✅ Carpeta por usuario |

**Ejecutar:** `supabase/migrations/fix_security_and_storage.sql` para aplicar estas políticas.

### 3. Bugs corregidos

- **cierres_mensuales**: Tenía `UNIQUE(mes)` global — dos usuarios no podían cerrar el mismo mes. Corregido a `UNIQUE(user_id, mes)`.

### 4. Autenticación

- Supabase Auth con JWT tokens
- Sesiones gestionadas por `@supabase/ssr`
- Token refresh automático
- Acceso multi-dispositivo: al ser auth basada en tokens, funciona desde cualquier dispositivo con las mismas credenciales

## Acceso multi-dispositivo para administradores

El admin puede acceder desde cualquier dispositivo porque:

1. **Autenticación por email/password** almacenada en Supabase Auth (no en el dispositivo)
2. **Todos los datos están en Supabase** (catálogo, clientes, expedientes, documentos)
3. **No hay dependencia de localStorage** para datos críticos (migrado a Supabase)
4. **Las sesiones son independientes** por dispositivo

## Backups y recuperación

### Backups automáticos de Supabase

| Plan | Frecuencia | Retención | PITR |
|------|------------|-----------|------|
| Free | Diario | 7 días | ❌ |
| Pro | Diario | 30 días | ✅ Cada 5 min |
| Team | Diario | 30 días | ✅ Cada 5 min |

### Backup manual (recomendado periódicamente)

```bash
# Exportar base de datos completa
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --data-only --no-owner --no-privileges > backup_$(date +%Y%m%d).sql

# Exportar solo datos de una tabla
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --data-only --table=public.clientes > clientes_backup.sql
```

### Sistema de auditoría

- Tabla `audit_log` registra todas las acciones (crear, editar, eliminar)
- Restauración de datos eliminados desde `/historial`
- Solo el admin tiene acceso completo al historial

## Migraciones pendientes por ejecutar

Ejecutar en este orden en el SQL Editor de Supabase:

1. `supabase/migrations/create_catalogo_tables.sql` — Tablas del catálogo sincronizado
2. `supabase/migrations/fix_security_and_storage.sql` — Correcciones de seguridad

## Checklist de verificación

- [x] RLS habilitado en todas las tablas
- [x] Políticas CRUD por usuario en todas las tablas
- [x] Storage con path aislado por user_id
- [x] Políticas de Storage para buckets
- [x] Catálogo migrado de localStorage a Supabase
- [x] UNIQUE constraint corregido en cierres_mensuales
- [x] audit_log con RLS habilitado
- [x] Sistema de auditoría activo
- [x] Admin con acceso multi-dispositivo
- [ ] Ejecutar `create_catalogo_tables.sql` en Supabase
- [ ] Ejecutar `fix_security_and_storage.sql` en Supabase
- [ ] Configurar backup periódico manual (recomendado semanal)
