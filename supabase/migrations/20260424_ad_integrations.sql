-- Migration: Ad Integrations (Meta Ads + TikTok Ads)
-- Armazena tokens e metadata das integrações de mídia paga
CREATE TABLE IF NOT EXISTS public.ad_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('meta', 'tiktok')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    account_id TEXT, -- ad_account_id selecionada (ex: act_123456 / advertiser_id)
    account_name TEXT,
    app_id TEXT, -- usado pelo TikTok (app_id) e opcional no Meta
    app_secret TEXT, -- opcional, usado para refresh
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, platform)
);

-- RLS
ALTER TABLE public.ad_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ad_integrations"
    ON public.ad_integrations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad_integrations"
    ON public.ad_integrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad_integrations"
    ON public.ad_integrations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad_integrations"
    ON public.ad_integrations FOR DELETE
    USING (auth.uid() = user_id);

-- Reutiliza função handle_updated_at já criada em migrations anteriores
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at'
    ) THEN
        CREATE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END$$;

DROP TRIGGER IF EXISTS set_ad_integrations_updated_at ON public.ad_integrations;
CREATE TRIGGER set_ad_integrations_updated_at
    BEFORE UPDATE ON public.ad_integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Cache opcional de insights diários para evitar bater em API toda hora
CREATE TABLE IF NOT EXISTS public.ad_insights_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('meta', 'tiktok')),
    account_id TEXT NOT NULL,
    date DATE NOT NULL,
    level TEXT NOT NULL DEFAULT 'account', -- 'account' | 'campaign' | 'adset' | 'ad'
    entity_id TEXT, -- id de campanha/adset/ad quando aplicável
    entity_name TEXT,
    spend NUMERIC DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    ctr NUMERIC DEFAULT 0,
    cpc NUMERIC DEFAULT 0,
    raw JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, platform, account_id, date, level, entity_id)
);

ALTER TABLE public.ad_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ad_insights_cache"
    ON public.ad_insights_cache FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad_insights_cache"
    ON public.ad_insights_cache FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad_insights_cache"
    ON public.ad_insights_cache FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad_insights_cache"
    ON public.ad_insights_cache FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_ad_insights_cache_updated_at ON public.ad_insights_cache;
CREATE TRIGGER set_ad_insights_cache_updated_at
    BEFORE UPDATE ON public.ad_insights_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_ad_insights_lookup
    ON public.ad_insights_cache(user_id, platform, account_id, date);
