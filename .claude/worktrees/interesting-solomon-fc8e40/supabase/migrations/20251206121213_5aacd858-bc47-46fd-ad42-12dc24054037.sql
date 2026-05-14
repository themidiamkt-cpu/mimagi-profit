-- Adicionar campo JSONB para canais de venda dinâmicos
ALTER TABLE public.planejamentos_financeiros
ADD COLUMN canais_venda JSONB DEFAULT '[]'::jsonb;