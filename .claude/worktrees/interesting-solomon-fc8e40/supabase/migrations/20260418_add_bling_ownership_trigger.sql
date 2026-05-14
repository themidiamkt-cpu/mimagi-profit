-- Migration: Add Ownership Trigger for Bling Orders
-- This ensures that any row inserted into bling_pedidos gets assigned a user_id
-- based on the current authenticated user if no user_id is provided.

CREATE OR REPLACE FUNCTION public.handle_bling_pedidos_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o user_id vier nulo, tentamos pegar do contexto da sessão (auth.uid())
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Se ainda assim for nulo (ex: chamado via service_role sem passar user_id),
  -- tentamos buscar o dono do token do Bling mais recente
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id 
    FROM public.bling_tokens 
    ORDER BY updated_at DESC LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove o trigger antigo se existir e cria o novo
DROP TRIGGER IF EXISTS ensure_bling_pedidos_ownership ON public.bling_pedidos;
CREATE TRIGGER ensure_bling_pedidos_ownership
BEFORE INSERT OR UPDATE ON public.bling_pedidos
FOR EACH ROW EXECUTE FUNCTION public.handle_bling_pedidos_ownership();
