-- Migration: Shopee Integration Tables
CREATE TABLE IF NOT EXISTS public.shopee_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id BIGINT NOT NULL,
    partner_key TEXT NOT NULL,
    shop_id BIGINT NOT NULL,
    redirect_uri TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'sandbox', -- 'production' or 'sandbox'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.shopee_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.shopee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopee_config
CREATE POLICY "Users can view their own shopee_config"
    ON public.shopee_config FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopee_config"
    ON public.shopee_config FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopee_config"
    ON public.shopee_config FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for shopee_tokens
CREATE POLICY "Users can view their own shopee_tokens"
    ON public.shopee_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopee_tokens"
    ON public.shopee_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopee_tokens"
    ON public.shopee_tokens FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shopee_config_updated_at
    BEFORE UPDATE ON public.shopee_config
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_shopee_tokens_updated_at
    BEFORE UPDATE ON public.shopee_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
