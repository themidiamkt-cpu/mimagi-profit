-- Migration: Add code_verifier to ml_config for PKCE support
ALTER TABLE public.ml_config 
ADD COLUMN IF NOT EXISTS code_verifier TEXT;
