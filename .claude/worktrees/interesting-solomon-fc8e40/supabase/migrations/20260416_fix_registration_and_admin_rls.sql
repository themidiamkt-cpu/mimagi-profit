-- Migration: Fix Registration Data and Admin Permissions
-- Version: 20260416_registration_and_admin_fix

-- 1. Update the handle_new_user function to extract more fields from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles using all available metadata
  INSERT INTO public.profiles (
    id, 
    nome, 
    email, 
    whatsapp, 
    nome_loja, 
    instagram_loja, 
    faturamento_atual
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'), 
    NEW.email,
    NEW.raw_user_meta_data->>'whatsapp',
    NEW.raw_user_meta_data->>'nome_loja',
    NEW.raw_user_meta_data->>'instagram_loja',
    COALESCE((NEW.raw_user_meta_data->>'faturamento_atual')::numeric, 0)
  );
  
  -- Create role as 'pending' (waiting for approval)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pending');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Add RLS Policies for Admins on Profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.is_admin(auth.uid()));

-- 3. Ensure user_roles policies are robust
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.is_admin(auth.uid()));

-- 4. Enable RLS on user_roles (it should be on already, but just in case)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
