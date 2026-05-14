-- =====================================================================
-- Migration consolidada e idempotente — Mercado Livre Integration
-- Aplica tabelas, colunas, policies e índices que as Edge Functions
-- esperam. Pode ser executada quantas vezes for preciso.
-- =====================================================================

-- 1. ml_config -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id BIGINT NOT NULL,
    secret_key TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.ml_config ADD COLUMN IF NOT EXISTS code_verifier TEXT;
ALTER TABLE public.ml_config ADD COLUMN IF NOT EXISTS seller_id BIGINT;
ALTER TABLE public.ml_config ADD COLUMN IF NOT EXISTS account_name TEXT;

-- 2. ml_tokens -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- 3. ml_orders ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ml_order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    order_date TIMESTAMPTZ NOT NULL,
    buyer_nickname TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, ml_order_id)
);

CREATE INDEX IF NOT EXISTS idx_ml_orders_user_date ON public.ml_orders(user_id, order_date DESC);

-- 4. ml_ads ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ml_item_id TEXT NOT NULL,
    title TEXT NOT NULL,
    sku TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL,
    visits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, ml_item_id)
);

ALTER TABLE public.ml_ads ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE public.ml_ads ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE public.ml_ads ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.ml_ads ADD COLUMN IF NOT EXISTS ad_sales DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.ml_ads ADD COLUMN IF NOT EXISTS acos DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.ml_ads ADD COLUMN IF NOT EXISTS ctr DECIMAL(10, 5) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ml_ads_user_stock ON public.ml_ads(user_id, stock_quantity);

-- 5. ml_sync_meta ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ml_sync_meta (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'never',
    last_sync TIMESTAMPTZ,
    total_orders INTEGER DEFAULT 0,
    total_ads INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ml_sync_meta ADD COLUMN IF NOT EXISTS last_error TEXT;

-- 6. RLS ------------------------------------------------------------------
ALTER TABLE public.ml_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_tokens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_ads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_sync_meta ENABLE ROW LEVEL SECURITY;

-- Helper: drop & recreate cada policy (idempotência sem complicação)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('ml_config','ml_tokens','ml_orders','ml_ads','ml_sync_meta')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I',
                       pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ml_config (4 ações para o usuário dono)
CREATE POLICY ml_config_select ON public.ml_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ml_config_insert ON public.ml_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ml_config_update ON public.ml_config FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ml_config_delete ON public.ml_config FOR DELETE USING (auth.uid() = user_id);

-- ml_tokens
CREATE POLICY ml_tokens_select ON public.ml_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ml_tokens_insert ON public.ml_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ml_tokens_update ON public.ml_tokens FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ml_tokens_delete ON public.ml_tokens FOR DELETE USING (auth.uid() = user_id);

-- ml_orders (escrita feita pela edge com service role; leitura pelo cliente)
CREATE POLICY ml_orders_select ON public.ml_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ml_orders_insert ON public.ml_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ml_orders_update ON public.ml_orders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ml_ads
CREATE POLICY ml_ads_select ON public.ml_ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ml_ads_insert ON public.ml_ads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ml_ads_update ON public.ml_ads FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ml_sync_meta
CREATE POLICY ml_sync_meta_select ON public.ml_sync_meta FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ml_sync_meta_insert ON public.ml_sync_meta FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ml_sync_meta_update ON public.ml_sync_meta FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Triggers updated_at --------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ml_config_updated_at') THEN
        CREATE TRIGGER set_ml_config_updated_at BEFORE UPDATE ON public.ml_config
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ml_tokens_updated_at') THEN
        CREATE TRIGGER set_ml_tokens_updated_at BEFORE UPDATE ON public.ml_tokens
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ml_orders_updated_at') THEN
        CREATE TRIGGER set_ml_orders_updated_at BEFORE UPDATE ON public.ml_orders
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ml_ads_updated_at') THEN
        CREATE TRIGGER set_ml_ads_updated_at BEFORE UPDATE ON public.ml_ads
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ml_sync_meta_updated_at') THEN
        CREATE TRIGGER set_ml_sync_meta_updated_at BEFORE UPDATE ON public.ml_sync_meta
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
