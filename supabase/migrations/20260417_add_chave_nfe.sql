-- Add unique NFe access key to prevent duplicate imports
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS chave_nfe TEXT UNIQUE;
