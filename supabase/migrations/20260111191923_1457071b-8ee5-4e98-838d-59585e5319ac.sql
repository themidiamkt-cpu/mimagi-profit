-- Atualizar a função de criação de usuário para definir admin automaticamente para o email específico
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Criar profile
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'), NEW.email);
  
  -- Definir role baseado no email
  IF NEW.email = 'themidiamkt@gmail.com' THEN
    user_role := 'admin';
  ELSE
    user_role := 'pending';
  END IF;
  
  -- Criar role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;