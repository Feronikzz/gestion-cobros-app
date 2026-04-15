-- Script automático para crear buckets y políticas de Storage
-- Ejecutar TODO este script en el SQL Editor de Supabase

-- =====================================================
-- 1. Crear función con permisos elevados (SECURITY DEFINER)
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_storage_buckets_and_policies()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- Ejecuta con permisos del owner
AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- =================================================
    -- CREAR BUCKET: documentos
    -- =================================================
    BEGIN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'documentos',
            'documentos',
            true,
            52428800,
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
        result := result || 'Bucket documentos: OK. ';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Bucket documentos: ' || SQLERRM || '. ';
    END;

    -- =================================================
    -- CREAR BUCKET: facturas
    -- =================================================
    BEGIN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'facturas',
            'facturas',
            true,
            10485760,
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
        result := result || 'Bucket facturas: OK. ';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Bucket facturas: ' || SQLERRM || '. ';
    END;

    -- =================================================
    -- POLÍTICAS PARA documentos
    -- =================================================
    BEGIN
        -- SELECT
        DROP POLICY IF EXISTS "documentos_select_own_policy" ON storage.objects;
        CREATE POLICY "documentos_select_own_policy" ON storage.objects
            FOR SELECT TO authenticated
            USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
        
        -- INSERT
        DROP POLICY IF EXISTS "documentos_insert_own_policy" ON storage.objects;
        CREATE POLICY "documentos_insert_own_policy" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
        
        -- UPDATE
        DROP POLICY IF EXISTS "documentos_update_own_policy" ON storage.objects;
        CREATE POLICY "documentos_update_own_policy" ON storage.objects
            FOR UPDATE TO authenticated
            USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
        
        -- DELETE
        DROP POLICY IF EXISTS "documentos_delete_own_policy" ON storage.objects;
        CREATE POLICY "documentos_delete_own_policy" ON storage.objects
            FOR DELETE TO authenticated
            USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);
        
        result := result || 'Políticas documentos: OK. ';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Políticas documentos: ' || SQLERRM || '. ';
    END;

    -- =================================================
    -- POLÍTICAS PARA facturas
    -- =================================================
    BEGIN
        -- SELECT
        DROP POLICY IF EXISTS "facturas_select_own_policy" ON storage.objects;
        CREATE POLICY "facturas_select_own_policy" ON storage.objects
            FOR SELECT TO authenticated
            USING (bucket_id = 'facturas' AND (storage.foldername(name))[1] = auth.uid()::text);
        
        -- INSERT
        DROP POLICY IF EXISTS "facturas_insert_own_policy" ON storage.objects;
        CREATE POLICY "facturas_insert_own_policy" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'facturas' AND (storage.foldername(name))[1] = auth.uid()::text);
        
        -- UPDATE
        DROP POLICY IF EXISTS "facturas_update_own_policy" ON storage.objects;
        CREATE POLICY "facturas_update_own_policy" ON storage.objects
            FOR UPDATE TO authenticated
            USING (bucket_id = 'facturas' AND (storage.foldername(name))[1] = auth.uid()::text);
        
        -- DELETE
        DROP POLICY IF EXISTS "facturas_delete_own_policy" ON storage.objects;
        CREATE POLICY "facturas_delete_own_policy" ON storage.objects
            FOR DELETE TO authenticated
            USING (bucket_id = 'facturas' AND (storage.foldername(name))[1] = auth.uid()::text);
        
        result := result || 'Políticas facturas: OK. ';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Políticas facturas: ' || SQLERRM || '. ';
    END;

    -- Habilitar RLS
    BEGIN
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        result := result || 'RLS habilitado: OK.';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'RLS: ' || SQLERRM;
    END;

    RETURN result;
END;
$$;

-- =====================================================
-- 2. Ejecutar la función (esto crea TODO automáticamente)
-- =====================================================
SELECT public.create_storage_buckets_and_policies() as resultado;

-- =====================================================
-- 3. Verificar que se crearon
-- =====================================================
SELECT id, name, public, file_size_limit/1024/1024 as max_mb
FROM storage.buckets 
WHERE id IN ('documentos', 'facturas');

-- =====================================================
-- 4. (Opcional) Eliminar la función después de usarla por seguridad
-- =====================================================
-- DESCOMENTAR LA SIGUIENTE LÍNEA SI QUIERES BORRAR LA FUNCIÓN:
-- DROP FUNCTION IF EXISTS public.create_storage_buckets_and_policies();
