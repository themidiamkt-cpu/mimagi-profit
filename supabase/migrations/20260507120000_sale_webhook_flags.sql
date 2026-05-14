ALTER TABLE public.bling_pedidos
ADD COLUMN IF NOT EXISTS sent_to_webhook BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bling_pedidos_webhook_pending
ON public.bling_pedidos(user_id, sent_to_webhook)
WHERE sent_to_webhook = false;

DO $$
BEGIN
  IF to_regclass('public.ml_orders') IS NOT NULL THEN
    ALTER TABLE public.ml_orders
    ADD COLUMN IF NOT EXISTS sent_to_webhook BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_ml_orders_webhook_pending
    ON public.ml_orders(user_id, sent_to_webhook)
    WHERE sent_to_webhook = false;
  END IF;

  IF to_regclass('public.shopee_orders') IS NOT NULL THEN
    ALTER TABLE public.shopee_orders
    ADD COLUMN IF NOT EXISTS sent_to_webhook BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_shopee_orders_webhook_pending
    ON public.shopee_orders(user_id, sent_to_webhook)
    WHERE sent_to_webhook = false;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS sent_to_webhook BOOLEAN NOT NULL DEFAULT false;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'orders'
        AND column_name = 'user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_orders_webhook_pending
      ON public.orders(user_id, sent_to_webhook)
      WHERE sent_to_webhook = false;
    END IF;
  END IF;
END $$;
