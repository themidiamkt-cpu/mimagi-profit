-- Adicionar coluna de categoria (público-alvo) na tabela compras
ALTER TABLE public.compras ADD COLUMN categoria text DEFAULT 'menina';

-- Adicionar constraint para valores válidos
ALTER TABLE public.compras ADD CONSTRAINT compras_categoria_check 
CHECK (categoria IN ('menina', 'menino', 'bebe', 'sapatos'));