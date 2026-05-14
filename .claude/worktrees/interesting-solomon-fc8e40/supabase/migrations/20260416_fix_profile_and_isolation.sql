-- 1. Restore Profile Access
-- Any authenticated user should be able to read and update THEIR OWN profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Ensure Isolation for Main Tables
-- We use a function to make it cleaner if needed, but simple RLS is robust enough
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamentos_financeiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_isolation" ON public.compras;
CREATE POLICY "user_isolation" ON public.compras
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_isolation" ON public.bling_pedidos;
CREATE POLICY "user_isolation" ON public.bling_pedidos
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_isolation" ON public.planejamentos_financeiros;
CREATE POLICY "user_isolation" ON public.planejamentos_financeiros
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Data Restoration
-- If the user's records were set to 'mimagikidslojainfantil@gmail.com' by mistake
-- we can't easily know who they belonged to UNLESS there's only one other user
-- OR we check records that have NULL user_id and were created recently.

-- For now, we ensure any record with NULL user_id that enters through the API 
-- gets assigned to the user in those sessions (done in code usually).

-- This migration sets up the permissions so that once the user logs in, 
-- they can actually see what they own.

NOTIFY pgrst, 'reload schema';
