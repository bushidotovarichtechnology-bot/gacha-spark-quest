ALTER TABLE public.prize_claims
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS idx_prize_claims_shipping_order_id
  ON public.prize_claims(shipping_order_id)
  WHERE shipping_order_id IS NOT NULL;

UPDATE public.prize_claims
   SET payment_status = CASE
     WHEN shipping_cost = 0 THEN 'not_required'
     WHEN shipping_paid = true THEN 'paid'
     ELSE 'unpaid'
   END
 WHERE payment_status = 'unpaid';