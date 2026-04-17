-- 1. Correct Schema for 'compras'
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS is_sapatos BOOLEAN DEFAULT FALSE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS qtd_pecas INTEGER DEFAULT 1;

-- MAKE planejamento_id OPTIONAL (Drop NOT NULL and FK if needed)
ALTER TABLE public.compras ALTER COLUMN planejamento_id DROP NOT NULL;
-- Optional: If the FK still causes issues with missing IDs, we could drop it, 
-- but usually dropping NOT NULL is enough if we don't provide the value.

-- 2. Data Restoration & Ownership Fix
DO $$ 
DECLARE
  wrong_id UUID := '7e853a85-573d-4328-ad18-128519782570'; -- Observed in Image
  correct_id UUID := '688e07c7-2340-4a5b-b71d-7221f01d675e'; -- Provided by user
BEGIN
  -- Transfer/Fix user_id in all tables
  UPDATE public.compras SET user_id = correct_id WHERE user_id = wrong_id OR user_id IS NULL;
  UPDATE public.bling_pedidos SET user_id = correct_id WHERE user_id = wrong_id OR user_id IS NULL;
  UPDATE public.bling_produtos SET user_id = correct_id WHERE user_id = wrong_id OR user_id IS NULL;
  UPDATE public.bling_config SET user_id = correct_id WHERE user_id = wrong_id OR user_id IS NULL;
  UPDATE public.planejamentos_financeiros SET user_id = correct_id WHERE user_id = wrong_id OR user_id IS NULL;

  -- Ensure the specific compras provided by the user exist and are correctly linked
  -- Note: We REMOVED planejamento_id from here to avoid FK errors
  INSERT INTO public.compras (id, estacao, marca, valor_total, prazo_pagamento, num_entregas, data_entrega_1, data_entrega_2, data_entrega_3, data_entrega_4, categoria, user_id, is_sapatos, qtd_pecas)
  VALUES 
    ('26e15c20-1095-4b1e-b598-b425a4ee4528', 'Inverno', 'Mon sucré', 20440, 150, 4, '2026-04-15', '2026-05-01', '2026-05-15', '2026-06-01', 'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', FALSE, 1),
    ('28479caf-fec6-45dc-b1ec-bf0792013940', 'Inverno', 'Mini Bear', 25200, 150, 4, '2026-04-15', '2026-05-01', '2026-05-15', '2026-06-01', 'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', FALSE, 1),
    ('9442c256-68e5-40a9-a30e-2652428f7901', 'Inverno', 'Nini Bambini', 19393, 180, 4, '2026-04-15', '2026-05-01', '2026-05-15', '2026-06-01', 'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', FALSE, 1),
    ('97e85381-172d-42e4-8464-499d8336f61b', 'Inverno', 'Petit Cherie', 33629, 150, 4, '2026-04-15', '2026-05-01', '2026-05-15', '2026-06-01', 'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', FALSE, 1),
    ('ba17dcb6-8490-4470-b380-e80000e25ea4', 'Inverno', 'Nini Bambini', 12550, 180, 3, '2026-03-01', '2026-03-15', '2026-04-01', NULL, 'menina', '688e07c7-2340-4a5b-b71d-7221f01d675e', FALSE, 1)
  ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id;

END $$;

-- 3. Reload Schema Cache for PostgREST
NOTIFY pgrst, 'reload schema';

-- 3. Reload Schema Cache for PostgREST
NOTIFY pgrst, 'reload schema';
