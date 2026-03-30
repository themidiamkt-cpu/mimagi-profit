-- Create purchases table for cash flow planning
CREATE TABLE public.compras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planejamento_id UUID REFERENCES public.planejamentos_financeiros(id) ON DELETE CASCADE,
  estacao TEXT NOT NULL,
  marca TEXT NOT NULL,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  prazo_pagamento INTEGER NOT NULL DEFAULT 180,
  num_entregas INTEGER NOT NULL DEFAULT 1 CHECK (num_entregas >= 1 AND num_entregas <= 4),
  data_entrega_1 DATE,
  data_entrega_2 DATE,
  data_entrega_3 DATE,
  data_entrega_4 DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching planejamentos_financeiros)
CREATE POLICY "Allow public read access on compras" 
ON public.compras 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on compras" 
ON public.compras 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on compras" 
ON public.compras 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access on compras" 
ON public.compras 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_compras_updated_at
BEFORE UPDATE ON public.compras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();