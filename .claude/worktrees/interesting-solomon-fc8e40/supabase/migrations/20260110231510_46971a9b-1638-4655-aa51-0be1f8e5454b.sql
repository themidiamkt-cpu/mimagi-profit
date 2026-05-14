-- Criar tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT NOT NULL,
  nome_loja TEXT,
  instagram_loja TEXT,
  faturamento_atual NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Adicionar user_id na tabela planejamentos_financeiros
ALTER TABLE public.planejamentos_financeiros 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remover políticas antigas de planejamentos_financeiros
DROP POLICY IF EXISTS "Allow public read access" ON public.planejamentos_financeiros;
DROP POLICY IF EXISTS "Allow public insert access" ON public.planejamentos_financeiros;
DROP POLICY IF EXISTS "Allow public update access" ON public.planejamentos_financeiros;

-- Novas políticas RLS para planejamentos_financeiros (por usuário)
CREATE POLICY "Users can view their own planejamentos"
ON public.planejamentos_financeiros FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own planejamentos"
ON public.planejamentos_financeiros FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planejamentos"
ON public.planejamentos_financeiros FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planejamentos"
ON public.planejamentos_financeiros FOR DELETE
USING (auth.uid() = user_id);

-- Adicionar user_id na tabela compras
ALTER TABLE public.compras 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remover políticas antigas de compras
DROP POLICY IF EXISTS "Allow public read access on compras" ON public.compras;
DROP POLICY IF EXISTS "Allow public insert access on compras" ON public.compras;
DROP POLICY IF EXISTS "Allow public update access on compras" ON public.compras;
DROP POLICY IF EXISTS "Allow public delete access on compras" ON public.compras;

-- Novas políticas RLS para compras (por usuário)
CREATE POLICY "Users can view their own compras"
ON public.compras FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compras"
ON public.compras FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compras"
ON public.compras FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compras"
ON public.compras FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at na tabela profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar profile automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar profile automaticamente
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();