ALTER TABLE public.bling_produtos
ADD COLUMN IF NOT EXISTS imagem_url TEXT,
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS colecao TEXT,
ADD COLUMN IF NOT EXISTS tamanho TEXT,
ADD COLUMN IF NOT EXISTS cor TEXT,
ADD COLUMN IF NOT EXISTS genero TEXT DEFAULT 'unissex',
ADD COLUMN IF NOT EXISTS custo NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS estoque_atual INTEGER,
ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER,
ADD COLUMN IF NOT EXISTS fornecedor TEXT,
ADD COLUMN IF NOT EXISTS codigo_barras TEXT,
ADD COLUMN IF NOT EXISTS ncm TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS observacoes TEXT;

COMMENT ON COLUMN public.bling_produtos.imagem_url IS 'URL da imagem principal do produto.';
COMMENT ON COLUMN public.bling_produtos.descricao IS 'Descrição comercial do produto.';
COMMENT ON COLUMN public.bling_produtos.colecao IS 'Coleção ou campanha do produto.';
COMMENT ON COLUMN public.bling_produtos.genero IS 'Público ou gênero do produto.';
COMMENT ON COLUMN public.bling_produtos.custo IS 'Custo unitário estimado do produto.';
COMMENT ON COLUMN public.bling_produtos.estoque_atual IS 'Saldo atual manual de estoque.';
COMMENT ON COLUMN public.bling_produtos.estoque_minimo IS 'Quantidade mínima para reposição.';
COMMENT ON COLUMN public.bling_produtos.status IS 'Status manual do produto no catálogo.';
