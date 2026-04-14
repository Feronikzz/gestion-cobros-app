-- =============================================================================
-- CREACIÓN AUTOMÁTICA DE POLÍTICAS DE STORAGE
-- Ejecutar en Supabase SQL Editor (funciona en la mayoría de proyectos)
-- =============================================================================

-- Primero, asegurarnos de que los buckets existan
-- (Si ya existen, esto no hará nada gracias a ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, avif_autodetection)
VALUES 
  ('documentos', 'documentos', false, 10485760, false),
  ('facturas', 'facturas', false, 10485760, false)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- =============================================================================
-- POLÍTICAS PARA BUCKET 'documentos'
-- =============================================================================

-- Política SELECT: Usuario solo ve sus archivos
DROP POLICY IF EXISTS "documentos_select_own_policy" ON storage.objects;
CREATE POLICY "documentos_select_own_policy" ON storage.objects
  FOR SELECT 
  TO authenticated
  USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política INSERT: Usuario solo sube a su carpeta  
DROP POLICY IF EXISTS "documentos_insert_own_policy" ON storage.objects;
CREATE POLICY "documentos_insert_own_policy" ON storage.objects
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política UPDATE: Usuario solo actualiza sus archivos
DROP POLICY IF EXISTS "documentos_update_own_policy" ON storage.objects;
CREATE POLICY "documentos_update_own_policy" ON storage.objects
  FOR UPDATE 
  TO authenticated
  USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política DELETE: Usuario solo elimina sus archivos
DROP POLICY IF EXISTS "documentos_delete_own_policy" ON storage.objects;
CREATE POLICY "documentos_delete_own_policy" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'documentos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- POLÍTICAS PARA BUCKET 'facturas'
-- =============================================================================

-- Política SELECT
DROP POLICY IF EXISTS "facturas_select_own_policy" ON storage.objects;
CREATE POLICY "facturas_select_own_policy" ON storage.objects
  FOR SELECT 
  TO authenticated
  USING (
    bucket_id = 'facturas' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política INSERT
DROP POLICY IF EXISTS "facturas_insert_own_policy" ON storage.objects;
CREATE POLICY "facturas_insert_own_policy" ON storage.objects
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'facturas' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política UPDATE
DROP POLICY IF EXISTS "facturas_update_own_policy" ON storage.objects;
CREATE POLICY "facturas_update_own_policy" ON storage.objects
  FOR UPDATE 
  TO authenticated
  USING (
    bucket_id = 'facturas' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política DELETE
DROP POLICY IF EXISTS "facturas_delete_own_policy" ON storage.objects;
CREATE POLICY "facturas_delete_own_policy" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (
    bucket_id = 'facturas' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- VERIFICACIÓN: Mostrar políticas creadas
-- =============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%documentos%' OR policyname LIKE '%facturas%'
ORDER BY policyname;
