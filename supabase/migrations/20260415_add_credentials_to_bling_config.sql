-- Migration: Adicionar campos de credenciais na tabela de configuração do Bling
ALTER TABLE public.bling_config 
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS client_secret TEXT;

-- Garantir que o RLS está ativo (já deve estar, mas por segurança)
ALTER TABLE public.bling_config ENABLE ROW LEVEL SECURITY;
