-- Migration: Add Seller Metadata and Sync tracking to ML
ALTER TABLE public.ml_config ADD COLUMN IF NOT EXISTS seller_id BIGINT;
ALTER TABLE public.ml_config ADD COLUMN IF NOT EXISTS account_name TEXT;

CREATE TABLE IF NOT EXISTS public.ml_sync_meta (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'never',
    last_sync TIMESTAMPTZ,
    total_orders INTEGER DEFAULT 0,
    total_ads INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ml_sync_meta ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ml_sync_meta' AND policyname = 'Users can view their own ml_sync_meta'
    ) THEN
        CREATE POLICY "Users can view their own ml_sync_meta" ON public.ml_sync_meta FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Trigger para updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ml_sync_meta_updated_at') THEN
        CREATE TRIGGER set_ml_sync_meta_updated_at BEFORE UPDATE ON public.ml_sync_meta FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
