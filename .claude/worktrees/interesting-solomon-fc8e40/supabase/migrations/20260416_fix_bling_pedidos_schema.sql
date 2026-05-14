-- Add source column to bling_pedidos if it doesn't exist
ALTER TABLE public.bling_pedidos ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'bling';

-- Refresh schema cache (hint for PostgREST)
NOTIFY pgrst, 'reload schema';
