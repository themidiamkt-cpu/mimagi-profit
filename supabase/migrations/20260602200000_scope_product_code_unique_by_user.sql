ALTER TABLE public.bling_produtos
DROP CONSTRAINT IF EXISTS bling_produtos_codigo_key;

DROP INDEX IF EXISTS public.bling_produtos_codigo_key;

CREATE UNIQUE INDEX IF NOT EXISTS bling_produtos_user_codigo_key
ON public.bling_produtos (user_id, codigo)
WHERE user_id IS NOT NULL AND codigo IS NOT NULL;
