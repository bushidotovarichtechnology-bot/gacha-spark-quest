
DROP POLICY IF EXISTS "Initiator can cancel own pending trade" ON public.trades;

CREATE POLICY "Initiator can cancel own pending trade"
ON public.trades
FOR UPDATE
TO authenticated
USING (
  auth.uid() = initiator_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = initiator_id
  AND status = 'cancelled'
  AND initiator_id  = (SELECT t.initiator_id  FROM public.trades t WHERE t.id = trades.id)
  AND responder_id  IS NOT DISTINCT FROM (SELECT t.responder_id  FROM public.trades t WHERE t.id = trades.id)
  AND recipient_id  IS NOT DISTINCT FROM (SELECT t.recipient_id  FROM public.trades t WHERE t.id = trades.id)
  AND initiator_items = (SELECT t.initiator_items FROM public.trades t WHERE t.id = trades.id)
  AND responder_items IS NOT DISTINCT FROM (SELECT t.responder_items FROM public.trades t WHERE t.id = trades.id)
  AND tier_label    = (SELECT t.tier_label    FROM public.trades t WHERE t.id = trades.id)
  AND token         = (SELECT t.token         FROM public.trades t WHERE t.id = trades.id)
  AND expires_at    = (SELECT t.expires_at    FROM public.trades t WHERE t.id = trades.id)
);
