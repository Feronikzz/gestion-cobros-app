# Sistema de Auditoría - Guía de Implementación

## 📋 Overview

Se ha implementado un sistema completo de auditoría que registra todos los eventos y acciones del sistema. Solo el admin (feronikz@gmail.com) puede acceder al historial completo.

## 🗄️ Base de Datos

### 1. Ejecutar el Schema SQL

Ejecuta los siguientes SQL en tu proyecto Supabase:

```sql
-- 1. Tabla de auditoría (lib/supabase/schema.sql)
-- Copiar y ejecutar el contenido completo del archivo

-- 2. Funciones de estadísticas (lib/supabase/functions.sql)
-- Copiar y ejecutar el contenido para obtener estadísticas optimizadas
```

**Importante:** La función `get_audit_stats()` es opcional. El sistema tiene un fallback automático que calcula las estadísticas manualmente si la función no está disponible.

### 2. Tabla Creada

- **audit_log**: Almacena todos los eventos de auditoría
- **RLS**: Configurado para que solo el admin vea todos los logs
- **Índices**: Optimizados para consultas rápidas

## 🔧 Edge Functions (Opcional)

Las Edge Functions son para un manejo más avanzado. Si no las quieres usar, el sistema funciona con el API route.

### Deploy Functions:

```bash
# Desde la raíz del proyecto
supabase functions deploy log-audit-event
supabase functions deploy restore-audit-event  
supabase functions deploy export-audit-logs
```

## 🚀 Implementación

### 1. Integrar en Hooks Existentes

Añade logging a tus hooks existentes:

```typescript
// En useClientes.ts
import { auditHelpers } from '@/lib/utils/audit-logger';

const createCliente = async (input: ClienteInsert) => {
  // ... tu código existente ...
  
  // Añadir logging
  await auditHelpers.logClienteCreated(data);
  return data;
};

const updateCliente = async (id: string, updates: ClienteUpdate) => {
  // Obtener datos antiguos
  const oldData = clientes.find(c => c.id === id);
  
  // ... tu código existente ...
  
  // Añadir logging
  await auditHelpers.logClienteUpdated(id, oldData, data);
  return data;
};

const deleteCliente = async (id: string) => {
  // Obtener datos antes de eliminar
  const oldData = clientes.find(c => c.id === id);
  
  // ... tu código existente ...
  
  // Añadir logging
  await auditHelpers.logClienteDeleted(oldData);
};
```

### 2. Login/Logout Logging

```typescript
// En tu página de login
import { auditHelpers } from '@/lib/utils/audit-logger';

const handleLogin = async () => {
  // ... tu código existente ...
  
  // Logging exitoso
  await auditHelpers.logLogin(email);
};

// En tu logout
const handleLogout = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  // ... tu código existente ...
  
  // Logging
  await auditHelpers.logLogout(user?.email);
};
```

### 3. Page View Tracking (Opcional)

```typescript
// En LayoutShell o componente principal
useEffect(() => {
  const logPageView = async () => {
    await auditHelpers.logPageView(window.location.pathname);
  };
  
  logPageView();
}, [pathname]);
```

## 🔐 Seguridad

### 1. Middleware de Protección

El middleware (`middleware-historial.ts`) protege la página `/historial`:

- ✅ Solo `feronikz@gmail.com` puede acceder
- ❌ Otros usuarios son redirigidos a `/dashboard`
- 🔒 Verificación de sesión en cada request

### 2. RLS Policies

Las políticas de Row Level Security aseguran:

- 👤 Usuarios solo ven sus propios logs
- 👑 Admin (`feronikz@gmail.com`) ve todos los logs
- 🚫 Solo el sistema puede insertar logs

## 📊 Funcionalidades

### 1. Página de Historial (`/historial`)

**Características:**
- 📋 Tabla completa de eventos
- 🔍 Filtros avanzados (usuario, acción, entidad, fecha)
- 📈 Estadísticas en tiempo real
- 👁️ Vista detallada de cada evento
- 🔄 Restauración de eliminaciones
- 📥 Exportación a CSV

**Estadísticas:**
- Total de eventos
- Eventos hoy/esta semana/este mes
- Top usuarios más activos
- Entidades más modificadas
- Restauraciones recientes

### 2. Restauración

**Qué se puede restaurar:**
- ✅ Clientes eliminados
- ✅ Cobros eliminados  
- ✅ Gastos eliminados
- ✅ Procedimientos eliminados

**Cómo funciona:**
1. Solo eventos `delete` se pueden restaurar
2. Se restaura con los valores originales (`old_values`)
3. Se marca el evento como restaurado
4. Se registra quién hizo la restauración

### 3. Exportación

- 📥 Exportar a CSV con filtros aplicados
- 📊 Incluye todos los campos del log
- 🔍 Formato legible para análisis

## 🎯 Uso Recomendado

### 1. Integración Gradual

```typescript
// Prioridad 1: Operaciones críticas
- create/delete de clientes
- create/delete de cobros
- Login/logout

// Prioridad 2: Operaciones importantes  
- update de cualquier entidad
- create/delete de gastos/procedimientos

// Prioridad 3: Tracking opcional
- Page views
- Exportaciones
- Actualizaciones menores
```

### 2. Mensajes Descriptivos

```typescript
// ✅ Buenos ejemplos
"Cliente creado: Juan Pérez"
"Cobro eliminado: 1500.00€"  
"Procedimiento actualizado: Divorcio amistoso"

// ❌ Evitar
"Cliente creado"
"Cobro eliminado"
"Update"
```

## 🔧 Troubleshooting

### 1. Logs no aparecen

**Verificar:**
- ✅ Schema SQL ejecutado correctamente
- ✅ Variables de entorno configuradas
- ✅ Usuario autenticado
- ✅ `auditHelpers` importado correctamente

### 2. Error de permisos

**Verificar:**
- ✅ RLS policies aplicadas
- ✅ Admin email correcto (`feronikz@gmail.com`)
- ✅ Middleware funcionando

### 3. Restauración no funciona

**Verificar:**
- ✅ Edge functions deployadas (si se usan)
- ✅ Solo eventos `delete` se pueden restaurar
- ✅ `old_values` guardados correctamente

## 📈 Monitoreo

### 1. Estadísticas Importantes

- **Eventos por día**: Actividad del sistema
- **Usuarios activos**: Uso por cuenta
- **Entidades más modificadas**: Áreas críticas
- **Restauraciones**: Errores o accidentes

### 2. Alertas Recomendadas

- 🚨 Múltiples eliminaciones en corto tiempo
- 🚨 Actividad inusual de usuarios
- 🚨 Errores de restauración frecuentes

## 🎉 Beneficios

1. **🔍 Trazabilidad Completa**: Sabes quién hizo qué y cuándo
2. **🛡️ Seguridad**: Detecta actividades sospechosas
3. **🔄 Recuperación**: Restaura eliminaciones accidentales
4. **📊 Análisis**: Entiende patrones de uso
5. **🔒 Cumplimiento**: Registro de auditoría profesional

## 🚀 Próximos Pasos

1. **Deploy del schema** en Supabase
2. **Integrar logging** en hooks principales
3. **Protección middleware** ya configurada
4. **Testing** con diferentes usuarios
5. **Monitor** la actividad inicial

---

**¡El sistema está listo para usar!** 🎉

Visita `/historial` para ver el panel de auditoría (solo admin).
