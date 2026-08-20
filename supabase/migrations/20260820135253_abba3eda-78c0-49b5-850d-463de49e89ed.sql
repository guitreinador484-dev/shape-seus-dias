ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS customer_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS purchases_provider_reference_key
  ON public.purchases (provider_reference) WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS purchases_transaction_id_idx ON public.purchases (transaction_id);