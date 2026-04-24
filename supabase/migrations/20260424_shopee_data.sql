-- Migration: Shopee Data Persistence
CREATE TABLE IF NOT EXISTS public.shopee_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shopee_order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    order_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, shopee_order_id)
);

CREATE TABLE IF NOT EXISTS public.shopee_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shopee_item_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, shopee_item_id)
);

-- Enable RLS
ALTER TABLE public.shopee_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopee_orders
CREATE POLICY "Users can view their own shopee_orders"
    ON public.shopee_orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopee_orders"
    ON public.shopee_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for shopee_products
CREATE POLICY "Users can view their own shopee_products"
    ON public.shopee_products FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopee_products"
    ON public.shopee_products FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER set_shopee_orders_updated_at
    BEFORE UPDATE ON public.shopee_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_shopee_products_updated_at
    BEFORE UPDATE ON public.shopee_products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
