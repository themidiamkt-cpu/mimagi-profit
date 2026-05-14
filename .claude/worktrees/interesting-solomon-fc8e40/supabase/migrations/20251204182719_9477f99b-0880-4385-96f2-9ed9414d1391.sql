-- Add channel planning fields to planejamentos_financeiros table

-- Channel distribution percentages
ALTER TABLE public.planejamentos_financeiros
ADD COLUMN IF NOT EXISTS canal_loja_fisica_perc numeric DEFAULT 30,
ADD COLUMN IF NOT EXISTS canal_instagram_ads_perc numeric DEFAULT 25,
ADD COLUMN IF NOT EXISTS canal_instagram_organico_perc numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS canal_whatsapp_perc numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS canal_shopee_perc numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS canal_indicacoes_perc numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS canal_eventos_perc numeric DEFAULT 5;

-- Investment per channel (in R$)
ALTER TABLE public.planejamentos_financeiros
ADD COLUMN IF NOT EXISTS invest_instagram_ads numeric DEFAULT 2000,
ADD COLUMN IF NOT EXISTS invest_promocoes numeric DEFAULT 500,
ADD COLUMN IF NOT EXISTS invest_whatsapp numeric DEFAULT 300,
ADD COLUMN IF NOT EXISTS invest_shopee numeric DEFAULT 500,
ADD COLUMN IF NOT EXISTS invest_influenciadores numeric DEFAULT 1000,
ADD COLUMN IF NOT EXISTS invest_outros numeric DEFAULT 200;

-- Ticket médio per channel
ALTER TABLE public.planejamentos_financeiros
ADD COLUMN IF NOT EXISTS ticket_loja_fisica numeric DEFAULT 180,
ADD COLUMN IF NOT EXISTS ticket_instagram_ads numeric DEFAULT 150,
ADD COLUMN IF NOT EXISTS ticket_whatsapp numeric DEFAULT 140,
ADD COLUMN IF NOT EXISTS ticket_shopee numeric DEFAULT 120;

-- CPV (cost per sale) per channel
ALTER TABLE public.planejamentos_financeiros
ADD COLUMN IF NOT EXISTS cpv_instagram_ads numeric DEFAULT 25,
ADD COLUMN IF NOT EXISTS cpv_whatsapp numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS cpv_shopee numeric DEFAULT 15;

-- Conversion rates per channel (%)
ALTER TABLE public.planejamentos_financeiros
ADD COLUMN IF NOT EXISTS conv_instagram_ads numeric DEFAULT 2.5,
ADD COLUMN IF NOT EXISTS conv_whatsapp numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS conv_shopee numeric DEFAULT 3;

-- Content planning per channel (weekly)
ALTER TABLE public.planejamentos_financeiros
ADD COLUMN IF NOT EXISTS conteudo_reels_ads numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS conteudo_criativos_trafego numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS conteudo_stories_dia numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS conteudo_posts_semana numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS conteudo_acoes_loja numeric DEFAULT 3,
ADD COLUMN IF NOT EXISTS conteudo_whatsapp numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS conteudo_shopee numeric DEFAULT 5;