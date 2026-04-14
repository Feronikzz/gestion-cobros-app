-- =============================================================================
-- Políticas de Storage - Ejecutar en Supabase SQL Editor
-- NOTA: Las políticas de storage deben crearse con el usuario de servicio o 
-- desde el dashboard de Supabase en Storage > Policies
-- =============================================================================

-- Verificar buckets existentes
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id IN ('documentos', 'facturas');

-- =============================================================================
-- INSTRUCCIONES MANUALES PARA POLÍTICAS DE STORAGE:
--
-- Desafortunadamente, las políticas de storage en Supabase requieren 
-- configuración manual en el dashboard o usando la API de servicio.
-- 
-- PASOS A SEGUIR:
--
-- 1. Ve a tu dashboard de Supabase
-- 2. Navega a: Storage → Buckets
-- 3. Para cada bucket ('documentos' y 'facturas'):
--    
--    a) Crear el bucket si no existe:
--       - New bucket → Name: "documentos" → Public: No
--       - New bucket → Name: "facturas" → Public: No
--    
--    b) Configurar políticas (Policies):
--       - Ve a la pestaña "Policies"
--       - New policy → Create a policy from scratch
--       
--       POLICY 1: INSERT (subir archivos)
--       Name: "Users can upload to their own folder"
--       Allowed operation: INSERT
--       Target: folder
--       Folder path: /{user_id}
--       Policy definition: auth.uid() = user_id
--       
--       POLICY 2: SELECT (ver archivos)
--       Name: "Users can view their own files"
--       Allowed operation: SELECT  
--       Target: folder
--       Folder path: /{user_id}
--       Policy definition: auth.uid() = user_id
--       
--       POLICY 3: DELETE (eliminar archivos)
--       Name: "Users can delete their own files"
--       Allowed operation: DELETE
--       Target: folder
--       Folder path: /{user_id}
--       Policy definition: auth.uid() = user_id
--
-- 4. Verificar que el path en la aplicación sea: {user_id}/...
--    - Esto ya está implementado en el código
--
-- ALTERNATIVA: Si prefieres usar SQL directo (requiere permisos de superuser):
-- =============================================================================

-- Solo si tienes permisos suficientes, intentar crear buckets:
INSERT INTO storage.buckets (id, name, public, file_size_limit, avif_autodetection)
VALUES 
  ('documentos', 'documentos', false, 10485760, false),
  ('facturas', 'facturas', false, 10485760, false)
ON CONFLICT (id) DO NOTHING;

-- Nota: Las políticas de storage.objects requieren usar el schema storage
-- y funciones específicas que pueden no estar disponibles en el SQL editor
-- Por eso se recomienda usar el dashboard para esta parte.
