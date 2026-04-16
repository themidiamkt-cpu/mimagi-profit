-- Migration: Sync Profiles from Auth Users
-- This will populate missing profiles for users that were created before the trigger was fixed.

-- 1. Insert missing profiles using data from auth.users
-- Simplified version without ON CONFLICT to avoid constraint errors
INSERT INTO public.profiles (id, email, nome)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'nome', 'Usuário')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 2. Ensure all users in profiles have at least a 'pending' role if they don't have any role yet
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'pending'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
);
