-- Tabela para armazenar planejamentos financeiros do Mimagi Profit Planner
CREATE TABLE public.planejamentos_financeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Seção 1: Variáveis Principais
  investimento_ciclo NUMERIC DEFAULT 60000,
  margem NUMERIC DEFAULT 2,
  
  -- Seção 2: Distribuição por Público
  perc_menina NUMERIC DEFAULT 40,
  perc_menino NUMERIC DEFAULT 35,
  perc_bebe NUMERIC DEFAULT 25,
  
  -- Seção 3: Roupas x Sapatos
  perc_roupas NUMERIC DEFAULT 70,
  perc_sapatos NUMERIC DEFAULT 30,
  
  -- Seção 4: Marcas Menina
  marca_menina_1_nome TEXT DEFAULT 'Marca A',
  marca_menina_1_perc NUMERIC DEFAULT 30,
  marca_menina_2_nome TEXT DEFAULT 'Marca B',
  marca_menina_2_perc NUMERIC DEFAULT 30,
  marca_menina_3_nome TEXT DEFAULT 'Marca C',
  marca_menina_3_perc NUMERIC DEFAULT 25,
  marca_menina_4_nome TEXT DEFAULT 'Marca D',
  marca_menina_4_perc NUMERIC DEFAULT 15,
  
  -- Seção 4: Marcas Menino
  marca_menino_1_nome TEXT DEFAULT 'Marca A',
  marca_menino_1_perc NUMERIC DEFAULT 30,
  marca_menino_2_nome TEXT DEFAULT 'Marca B',
  marca_menino_2_perc NUMERIC DEFAULT 30,
  marca_menino_3_nome TEXT DEFAULT 'Marca C',
  marca_menino_3_perc NUMERIC DEFAULT 25,
  marca_menino_4_nome TEXT DEFAULT 'Marca D',
  marca_menino_4_perc NUMERIC DEFAULT 15,
  
  -- Seção 4: Marcas Bebê
  marca_bebe_1_nome TEXT DEFAULT 'Marca A',
  marca_bebe_1_perc NUMERIC DEFAULT 30,
  marca_bebe_2_nome TEXT DEFAULT 'Marca B',
  marca_bebe_2_perc NUMERIC DEFAULT 30,
  marca_bebe_3_nome TEXT DEFAULT 'Marca C',
  marca_bebe_3_perc NUMERIC DEFAULT 25,
  marca_bebe_4_nome TEXT DEFAULT 'Marca D',
  marca_bebe_4_perc NUMERIC DEFAULT 15,
  
  -- Seção 4: Marcas Sapatos
  marca_sapato_1_nome TEXT DEFAULT 'Marca Sapato A',
  marca_sapato_1_perc NUMERIC DEFAULT 60,
  marca_sapato_2_nome TEXT DEFAULT 'Marca Sapato B',
  marca_sapato_2_perc NUMERIC DEFAULT 40,
  
  -- Seção 5: Tipos de Peça Menina
  tipo_menina_vestidos NUMERIC DEFAULT 30,
  tipo_menina_conjuntos NUMERIC DEFAULT 30,
  tipo_menina_casual NUMERIC DEFAULT 25,
  tipo_menina_basicos NUMERIC DEFAULT 15,
  
  -- Seção 5: Tipos de Peça Menino
  tipo_menino_conjuntos NUMERIC DEFAULT 40,
  tipo_menino_casual NUMERIC DEFAULT 35,
  tipo_menino_basicos NUMERIC DEFAULT 25,
  
  -- Seção 5: Tipos de Peça Bebê
  tipo_bebe_conjuntos NUMERIC DEFAULT 40,
  tipo_bebe_casual NUMERIC DEFAULT 35,
  tipo_bebe_basicos NUMERIC DEFAULT 25,
  
  -- Seção 6: Ticket Médio
  tm_menina NUMERIC DEFAULT 150,
  tm_menino NUMERIC DEFAULT 140,
  tm_bebe NUMERIC DEFAULT 120,
  
  -- Seção 7: Custos Fixos
  custo_aluguel NUMERIC DEFAULT 3000,
  custo_salarios NUMERIC DEFAULT 5000,
  custo_encargos NUMERIC DEFAULT 1500,
  custo_agua_luz NUMERIC DEFAULT 500,
  custo_internet NUMERIC DEFAULT 150,
  custo_contador NUMERIC DEFAULT 800,
  custo_embalagens NUMERIC DEFAULT 300,
  custo_sistema NUMERIC DEFAULT 200,
  custo_marketing NUMERIC DEFAULT 1000,
  custo_outros NUMERIC DEFAULT 500
);

-- Enable Row Level Security
ALTER TABLE public.planejamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read all records (no auth required)
CREATE POLICY "Allow public read access"
ON public.planejamentos_financeiros
FOR SELECT
USING (true);

-- Policy: Anyone can insert new records (no auth required)
CREATE POLICY "Allow public insert access"
ON public.planejamentos_financeiros
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can update any record (no auth required)
CREATE POLICY "Allow public update access"
ON public.planejamentos_financeiros
FOR UPDATE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_planejamentos_updated_at
BEFORE UPDATE ON public.planejamentos_financeiros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();