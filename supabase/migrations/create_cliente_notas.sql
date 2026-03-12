-- ─── Cliente Notas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cliente_notas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    nota text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.cliente_notas ENABLE ROW LEVEL SECURITY;

-- Crear políticas para cliente_notas
DO $$
BEGIN
    -- Políticas para cliente_notas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_notas' AND policyname = 'cliente_notas_select_own') THEN
        CREATE POLICY "cliente_notas_select_own" ON public.cliente_notas FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_notas' AND policyname = 'cliente_notas_insert_own') THEN
        CREATE POLICY "cliente_notas_insert_own" ON public.cliente_notas FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_notas' AND policyname = 'cliente_notas_update_own') THEN
        CREATE POLICY "cliente_notas_update_own" ON public.cliente_notas FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cliente_notas' AND policyname = 'cliente_notas_delete_own') THEN
        CREATE POLICY "cliente_notas_delete_own" ON public.cliente_notas FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Índices para cliente_notas
CREATE INDEX IF NOT EXISTS idx_cliente_notas_user_id ON public.cliente_notas(user_id);
CREATE INDEX IF NOT EXISTS idx_cliente_notas_cliente_id ON public.cliente_notas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_notas_created_at ON public.cliente_notas(created_at DESC);
