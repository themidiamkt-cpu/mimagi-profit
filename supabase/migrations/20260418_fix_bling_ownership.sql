-- Migration: Fix Orphaned Bling Orders
-- This connects any rows with NULL user_id in bling_pedidos to the user who owns the tokens.

DO $$ 
DECLARE
  token_user_id UUID;
BEGIN
  -- Get the most recent user who has a Bling token
  SELECT user_id INTO token_user_id 
  FROM public.bling_tokens 
  ORDER BY updated_at DESC LIMIT 1;

  IF token_user_id IS NOT NULL THEN
    -- Update orphaned rows
    UPDATE public.bling_pedidos 
    SET user_id = token_user_id 
    WHERE user_id IS NULL;
    
    RAISE NOTICE 'Updated orphaned rows to user_id %', token_user_id;
  END IF;
END $$;
