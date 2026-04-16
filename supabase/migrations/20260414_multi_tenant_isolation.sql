-- Step 1: Add user_id to all relevant tables and source to bling_pedidos
ALTER TABLE public.bling_pedidos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.bling_pedidos ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'bling';

ALTER TABLE public.bling_produtos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.bling_config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to main app tables
ALTER TABLE public.growth_customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.fichinhas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.planejamentos_financeiros ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Tables that might already have user_id but need RLS verification
-- (profiles, user_roles)

-- Step 2: Transform bling_sync_meta to be multi-tenant
-- We drop the 'id' serial and use user_id as identifier
ALTER TABLE public.bling_sync_meta ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- We'll filter by user_id instead of id=1 in the code

-- Step 3: Enable RLS on everything
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Step 4: Create Policies
-- Bling Pedidos
DROP POLICY IF EXISTS "user_isolation" ON public.bling_pedidos;
CREATE POLICY "user_isolation" ON public.bling_pedidos
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Bling Produtos
DROP POLICY IF EXISTS "user_isolation" ON public.bling_produtos;
CREATE POLICY "user_isolation" ON public.bling_produtos
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Bling Sync Meta
DROP POLICY IF EXISTS "user_isolation" ON public.bling_sync_meta;
CREATE POLICY "user_isolation" ON public.bling_sync_meta
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Bling Config
DROP POLICY IF EXISTS "user_isolation" ON public.bling_config;
CREATE POLICY "user_isolation" ON public.bling_config
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Growth Customers
DROP POLICY IF EXISTS "user_isolation" ON public.growth_customers;
CREATE POLICY "user_isolation" ON public.growth_customers
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Children
DROP POLICY IF EXISTS "user_isolation" ON public.children;
CREATE POLICY "user_isolation" ON public.children
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fichinhas
DROP POLICY IF EXISTS "user_isolation" ON public.fichinhas;
CREATE POLICY "user_isolation" ON public.fichinhas
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabs
DROP POLICY IF EXISTS "user_isolation" ON public.tabs;
CREATE POLICY "user_isolation" ON public.tabs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Installments
DROP POLICY IF EXISTS "user_isolation" ON public.installments;
CREATE POLICY "user_isolation" ON public.installments
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Customers
DROP POLICY IF EXISTS "user_isolation" ON public.customers;
CREATE POLICY "user_isolation" ON public.customers
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Compras
DROP POLICY IF EXISTS "user_isolation" ON public.compras;
CREATE POLICY "user_isolation" ON public.compras
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Planejamentos Financeiros
DROP POLICY IF EXISTS "user_isolation" ON public.planejamentos_financeiros;
CREATE POLICY "user_isolation" ON public.planejamentos_financeiros
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
