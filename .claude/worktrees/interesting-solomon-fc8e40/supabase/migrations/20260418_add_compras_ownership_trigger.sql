-- Create a trigger to ensure that every new purchase is linked to the authenticated user
-- even if the frontend fails to pass the user_id.

CREATE OR REPLACE FUNCTION public.ensure_compras_ownership()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Se já tem user_id, não faz nada
  IF NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Tenta pegar o ID do usuário da sessão atual (auth.uid())
  v_owner_id := auth.uid();

  -- 2. Atribui o ID encontrado se houver sessão
  -- Para compras, não temos um fallback de token como nos pedidos do Bling,
  -- pois compras são ações manuais do usuário logado.
  IF v_owner_id IS NOT NULL THEN
    NEW.user_id := v_owner_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar o gatilho na tabela compras
DROP TRIGGER IF EXISTS tr_ensure_compras_ownership ON public.compras;
CREATE TRIGGER tr_ensure_compras_ownership
BEFORE INSERT ON public.compras
FOR EACH ROW
EXECUTE FUNCTION public.ensure_compras_ownership();
