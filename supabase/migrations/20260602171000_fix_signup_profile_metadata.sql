CREATE OR REPLACE FUNCTION public.profile_metadata_revenue(metadata jsonb)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  revenue_text text;
BEGIN
  revenue_text := NULLIF(metadata->>'faturamento_atual', '');

  IF revenue_text IS NULL THEN
    RETURN 0;
  END IF;

  IF revenue_text ~ '^[0-9]+([.,][0-9]+)?$' THEN
    RETURN replace(revenue_text, ',', '.')::numeric;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    nome,
    email,
    whatsapp,
    nome_loja,
    instagram_loja,
    faturamento_atual,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1), 'Usuário'),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'whatsapp', ''),
    NULLIF(NEW.raw_user_meta_data->>'nome_loja', ''),
    NULLIF(NEW.raw_user_meta_data->>'instagram_loja', ''),
    public.profile_metadata_revenue(NEW.raw_user_meta_data),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(NULLIF(EXCLUDED.nome, ''), public.profiles.nome),
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.profiles.email),
    whatsapp = COALESCE(EXCLUDED.whatsapp, public.profiles.whatsapp),
    nome_loja = COALESCE(EXCLUDED.nome_loja, public.profiles.nome_loja),
    instagram_loja = COALESCE(EXCLUDED.instagram_loja, public.profiles.instagram_loja),
    faturamento_atual = COALESCE(EXCLUDED.faturamento_atual, public.profiles.faturamento_atual),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

INSERT INTO public.profiles (
  id,
  nome,
  email,
  whatsapp,
  nome_loja,
  instagram_loja,
  faturamento_atual,
  created_at,
  updated_at
)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'nome', ''), NULLIF(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1), 'Usuário'),
  u.email,
  NULLIF(u.raw_user_meta_data->>'whatsapp', ''),
  NULLIF(u.raw_user_meta_data->>'nome_loja', ''),
  NULLIF(u.raw_user_meta_data->>'instagram_loja', ''),
  public.profile_metadata_revenue(u.raw_user_meta_data),
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles p
SET
  nome = CASE
    WHEN p.nome IS NULL OR p.nome IN ('Usuário', 'Usuario', 'Usuário sem nome') THEN COALESCE(NULLIF(u.raw_user_meta_data->>'nome', ''), NULLIF(u.raw_user_meta_data->>'name', ''), p.nome)
    ELSE p.nome
  END,
  whatsapp = COALESCE(p.whatsapp, NULLIF(u.raw_user_meta_data->>'whatsapp', '')),
  nome_loja = COALESCE(p.nome_loja, NULLIF(u.raw_user_meta_data->>'nome_loja', '')),
  instagram_loja = COALESCE(p.instagram_loja, NULLIF(u.raw_user_meta_data->>'instagram_loja', '')),
  faturamento_atual = CASE
    WHEN p.faturamento_atual IS NULL OR p.faturamento_atual = 0 THEN public.profile_metadata_revenue(u.raw_user_meta_data)
    ELSE p.faturamento_atual
  END,
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'pending'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;
