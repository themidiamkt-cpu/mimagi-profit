ALTER TABLE public.growth_customers
  ADD COLUMN IF NOT EXISTS crm_stage TEXT NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS crm_notes TEXT;

ALTER TABLE public.growth_customers
  DROP CONSTRAINT IF EXISTS growth_customers_crm_stage_check;

ALTER TABLE public.growth_customers
  ADD CONSTRAINT growth_customers_crm_stage_check
  CHECK (crm_stage IN ('novo', 'contato', 'negociacao', 'convertido', 'perdido'));

UPDATE public.growth_customers
SET crm_stage = CASE
  WHEN COALESCE(total_orders, 0) > 0 THEN 'convertido'
  ELSE 'novo'
END
WHERE crm_stage IS NULL;
