-- Add provider tracking columns to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'midtrans',
  ADD COLUMN IF NOT EXISTS provider_reference text;

CREATE INDEX IF NOT EXISTS idx_transactions_provider_ref
  ON public.transactions(provider, provider_reference);

-- Seed payment_provider app setting if not present
INSERT INTO public.app_settings (key, value)
VALUES (
  'payment_provider',
  jsonb_build_object(
    'active', 'midtrans',
    'ipaymu_mode', 'sandbox'
  )
)
ON CONFLICT (key) DO NOTHING;