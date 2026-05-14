
-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'pending');

-- Criar tabela de roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Função para verificar se usuário está aprovado
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'user')
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Permitir inserção via trigger (sem policy restritiva para INSERT)
CREATE POLICY "Allow insert for new users"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Atualizar trigger de criação de usuário para adicionar role 'pending'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar profile
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'), NEW.email);
  
  -- Criar role como 'pending' (aguardando aprovação)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pending');
  
  RETURN NEW;
END;
$$;

-- Atualizar políticas das tabelas existentes para verificar aprovação
DROP POLICY IF EXISTS "Users can view their own planejamentos" ON public.planejamentos_financeiros;
DROP POLICY IF EXISTS "Users can insert their own planejamentos" ON public.planejamentos_financeiros;
DROP POLICY IF EXISTS "Users can update their own planejamentos" ON public.planejamentos_financeiros;
DROP POLICY IF EXISTS "Users can delete their own planejamentos" ON public.planejamentos_financeiros;

CREATE POLICY "Approved users can view their own planejamentos"
ON public.planejamentos_financeiros
FOR SELECT
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users can insert their own planejamentos"
ON public.planejamentos_financeiros
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users can update their own planejamentos"
ON public.planejamentos_financeiros
FOR UPDATE
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users can delete their own planejamentos"
ON public.planejamentos_financeiros
FOR DELETE
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

-- Atualizar políticas de compras
DROP POLICY IF EXISTS "Users can view their own compras" ON public.compras;
DROP POLICY IF EXISTS "Users can insert their own compras" ON public.compras;
DROP POLICY IF EXISTS "Users can update their own compras" ON public.compras;
DROP POLICY IF EXISTS "Users can delete their own compras" ON public.compras;

CREATE POLICY "Approved users can view their own compras"
ON public.compras
FOR SELECT
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users can insert their own compras"
ON public.compras
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users can update their own compras"
ON public.compras
FOR UPDATE
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users can delete their own compras"
ON public.compras
FOR DELETE
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));
