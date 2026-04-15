-- Crear bucket 'documentos' en Supabase Storage si no existe
-- Ejecutar esto en el SQL Editor de Supabase

-- 1. Crear el bucket (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  true,  -- público para permitir URLs públicas
  52428800,  -- 50MB en bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Eliminar políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "documentos_select_own_policy" ON storage.objects;
DROP POLICY IF EXISTS "documentos_insert_own_policy" ON storage.objects;
DROP POLICY IF EXISTS "documentos_update_own_policy" ON storage.objects;
DROP POLICY IF EXISTS "documentos_delete_own_policy" ON storage.objects;

-- 3. Crear políticas de seguridad RLS (Row Level Security)
-- Solo el propietario (user_id en el path) puede ver/suber/modificar/eliminar sus archivos

-- Política SELECT: Solo puede ver archivos de su propia carpeta (user_id)
CREATE POLICY "documentos_select_own_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política INSERT: Solo puede subir a su propia carpeta
CREATE POLICY "documentos_insert_own_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política UPDATE: Solo puede modificar archivos de su propia carpeta
CREATE POLICY "documentos_update_own_policy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política DELETE: Solo puede eliminar archivos de su propia carpeta
CREATE POLICY "documentos_delete_own_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Habilitar RLS en la tabla objects (si no está habilitado)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Verificar que todo se creó correctamente
SELECT 'Bucket creado/actualizado: documentos' as status;
SELECT 'Políticas creadas para bucket documentos' as status;
