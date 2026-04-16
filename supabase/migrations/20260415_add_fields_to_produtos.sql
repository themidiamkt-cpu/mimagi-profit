-- Migration: Adicionar preço e categoria à tabela bling_produtos
ALTER TABLE public.bling_produtos ADD COLUMN IF NOT EXISTS preco DECIMAL(12,2);
ALTER TABLE public.bling_produtos ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Adicionar também à tabela de rascunho de itens caso necessário
-- (Atualmente usamos a tabela de itens do Bling, que já tem valor_unidade)

COMMENT ON COLUMN public.bling_produtos.preco IS 'Preço de venda mestre do produto.';
COMMENT ON COLUMN public.bling_produtos.categoria IS 'Categoria do produto para análise de mix.';
