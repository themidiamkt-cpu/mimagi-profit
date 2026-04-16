-- Migration to fix isolation leaks and link orphaned data to the main account
-- VERSION 2: Dynamic Policy Cleanup

DO $$ 
DECLARE
    target_user_id UUID;
    t TEXT;
    pol RECORD;
    tables TEXT[] := ARRAY[
        'customers', 'tabs', 'compras', 'planejamentos_financeiros', 
        'bling_pedidos', 'bling_produtos', 'bling_config', 'bling_sync_meta',
        'growth_customers', 'children'
    ];
BEGIN
    -- 1. Find the main account ID
    SELECT id INTO target_user_id FROM public.profiles WHERE email = 'mimagikidslojainfantil@gmail.com' LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'ALERTA: Email mimagikidslojainfantil@gmail.com não encontrado na tabela profiles!';
    ELSE
        RAISE NOTICE 'Conta principal encontrada: %', target_user_id;
    END IF;

    -- 2. Clean up ALL existing policies on these tables to prevent overrides
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = ANY(tables)
    LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Política removida: % na tabela %', pol.policyname, pol.tablename;
    END LOOP;

    -- Also check for 'installments' specifically
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'installments'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;

    -- 3. Ensure user_id column and link orphaned data
    FOREACH t IN ARRAY tables
    LOOP
        -- Add column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN user_id UUID REFERENCES auth.users(id)', t);
            RAISE NOTICE 'Coluna user_id adicionada na tabela %', t;
        END IF;

        -- Link orphaned data
        IF target_user_id IS NOT NULL THEN
            EXECUTE format('UPDATE public.%I SET user_id = %L WHERE user_id IS NULL', t, target_user_id);
        END IF;

        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- Create strict isolation policy
        EXECUTE format('CREATE POLICY "user_isolation" ON public.%I USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t);
        RAISE NOTICE 'RLS estrito aplicado na tabela %', t;
    END LOOP;

    -- Handle 'installments' specifically as it might be missing in some environments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'installments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'user_id') THEN
            ALTER TABLE public.installments ADD COLUMN user_id UUID REFERENCES auth.users(id);
        END IF;
        
        IF target_user_id IS NOT NULL THEN
            UPDATE public.installments SET user_id = target_user_id WHERE user_id IS NULL;
        END IF;
        
        ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "user_isolation" ON public.installments USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;

END $$;
