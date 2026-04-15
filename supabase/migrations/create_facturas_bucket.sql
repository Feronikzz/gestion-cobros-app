-- Crear bucket 'facturas' en Supabase Storage
-- Ejecutar en SQL Editor (si tienes permisos) o crear manualmente en UI

-- 1. Crear el bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'facturas',
  'facturas',
  true,
  10485760,  -- 10MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Políticas para facturas (mismo patrón que documentos)
DROP POLICY IF EXISTS "facturas_select_own_policy" ON storage.objects;
DROP POLICY IF EXISTS "facturas_insert_own_policy" ON storage.objects;
DROP POLICY IF EXISTS "facturas_update_own_policy" ON storage.objects;
DROP POLICY IF EXISTS "facturas_delete_own_policy" ON storage.objects;

CREATE POLICY "facturas_select_own_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'facturas' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "facturas_insert_own_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'facturas' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "facturas_update_own_policy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'facturas' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "facturas_delete_own_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'facturas' AND (storage.foldername(name))[1] = auth.uid()::text);

SELECT 'Bucket facturas creado' as status;
