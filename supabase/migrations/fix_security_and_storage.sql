-- =============================================================================
-- MIGRACIÓN DE SEGURIDAD - Correcciones de aislamiento y Storage
-- Ejecutar en Supabase SQL Editor
-- =============================================================================

-- ─── FIX 1: cierres_mensuales UNIQUE constraint ───────────────────────
-- BUG: UNIQUE(mes) impide que dos usuarios diferentes cierren el mismo mes
-- FIX: Cambiar a UNIQUE(user_id, mes)
ALTER TABLE public.cierres_mensuales DROP CONSTRAINT IF EXISTS cierres_mensuales_mes_key;
ALTER TABLE public.cierres_mensuales ADD CONSTRAINT cierres_mensuales_user_mes_unique UNIQUE(user_id, mes);

-- ─── FIX 2: Políticas de Storage para bucket 'documentos' ────────────
-- Los archivos se guardan con path: {user_id}/{procedimiento_id}/{timestamp}-{filename}
-- Esto asegura que cada usuario solo puede acceder a sus propios archivos

-- Crear bucket si no existe (ejecutar manualmente si falla)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documentos', 'documentos', false, 10485760, ARRAY[
  'application/pdf', 
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
])
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 10485760;

-- Políticas de Storage para documentos
-- Solo el propietario puede subir archivos en su carpeta
DROP POLICY IF EXISTS "documentos_insert_own" ON storage.objects;
CREATE POLICY "documentos_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Solo el propietario puede ver sus archivos
DROP POLICY IF EXISTS "documentos_select_own" ON storage.objects;
CREATE POLICY "documentos_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Solo el propietario puede actualizar sus archivos
DROP POLICY IF EXISTS "documentos_update_own" ON storage.objects;
CREATE POLICY "documentos_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Solo el propietario puede eliminar sus archivos
DROP POLICY IF EXISTS "documentos_delete_own" ON storage.objects;
CREATE POLICY "documentos_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── FIX 3: Políticas de Storage para bucket 'facturas' ──────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('facturas', 'facturas', false, 10485760, ARRAY[
  'application/pdf', 
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
])
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 10485760;

DROP POLICY IF EXISTS "facturas_storage_insert_own" ON storage.objects;
CREATE POLICY "facturas_storage_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'facturas' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "facturas_storage_select_own" ON storage.objects;
CREATE POLICY "facturas_storage_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'facturas' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "facturas_storage_update_own" ON storage.objects;
CREATE POLICY "facturas_storage_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'facturas' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "facturas_storage_delete_own" ON storage.objects;
CREATE POLICY "facturas_storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'facturas' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── FIX 4: Verificar RLS en audit_log ────────────────────────────────
-- audit_log debería tener RLS para que solo admins vean todo
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' AND table_schema = 'public') THEN
        ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
        
        -- Solo el propio usuario puede ver sus logs
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_select_own') THEN
            CREATE POLICY "audit_log_select_own" ON public.audit_log 
              FOR SELECT USING (auth.uid() = user_id);
        END IF;
        
        -- Solo el propio usuario puede insertar sus logs
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_insert_own') THEN
            CREATE POLICY "audit_log_insert_own" ON public.audit_log 
              FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- ─── FIX 5: Habilitar PITR (Point-in-Time Recovery) ──────────────────
-- NOTA: Los backups automáticos de Supabase están habilitados por defecto.
-- En plan Pro+ tienes PITR (Point-in-Time Recovery) cada 5 minutos.
-- En plan Free tienes backups diarios automáticos.
-- 
-- Para backup manual adicional, ejecutar periódicamente:
-- pg_dump --data-only --no-owner --no-privileges tu_base_de_datos > backup.sql

-- ─── Verificación final ──────────────────────────────────────────────
-- Mostrar todas las tablas con su estado de RLS
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
