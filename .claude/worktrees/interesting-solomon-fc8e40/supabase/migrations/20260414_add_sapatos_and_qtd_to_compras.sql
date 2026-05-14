-- Adicionar colunas is_sapatos e qtd_pecas à tabela compras
ALTER TABLE public.compras 
ADD COLUMN IF NOT EXISTS is_sapatos BOOLEAN DEFAULT false;

ALTER TABLE public.compras 
ADD COLUMN IF NOT EXISTS qtd_pecas INTEGER DEFAULT 0;
