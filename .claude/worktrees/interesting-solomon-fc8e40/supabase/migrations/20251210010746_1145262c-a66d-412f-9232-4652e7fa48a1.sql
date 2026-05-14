-- Add column for realized revenue tracking
ALTER TABLE public.planejamentos_financeiros 
ADD COLUMN IF NOT EXISTS faturamento_realizado numeric DEFAULT 0;