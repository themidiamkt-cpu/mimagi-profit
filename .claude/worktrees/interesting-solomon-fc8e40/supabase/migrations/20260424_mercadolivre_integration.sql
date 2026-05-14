-- Migration: Mercado Livre Integration Tables
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

-- Enable RLS
ALTER TABLE public.ml_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_ads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ml_config
CREATE POLICY "Users can view their own ml_config" ON public.ml_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ml_config" ON public.ml_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ml_config" ON public.ml_config FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ml_tokens
CREATE POLICY "Users can view their own ml_tokens" ON public.ml_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ml_tokens" ON public.ml_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ml_tokens" ON public.ml_tokens FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ml_orders
CREATE POLICY "Users can view their own ml_orders" ON public.ml_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ml_orders" ON public.ml_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ml_ads
CREATE POLICY "Users can view their own ml_ads" ON public.ml_ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ml_ads" ON public.ml_ads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER set_ml_config_updated_at BEFORE UPDATE ON public.ml_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_ml_tokens_updated_at BEFORE UPDATE ON public.ml_tokens FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_ml_orders_updated_at BEFORE UPDATE ON public.ml_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_ml_ads_updated_at BEFORE UPDATE ON public.ml_ads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
