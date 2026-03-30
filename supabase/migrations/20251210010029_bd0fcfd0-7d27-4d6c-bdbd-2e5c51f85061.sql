-- Add JSONB column for dynamic custom costs
ALTER TABLE public.planejamentos_financeiros 
ADD COLUMN IF NOT EXISTS custos_extras jsonb DEFAULT '[]'::jsonb;