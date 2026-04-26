-- 1. Add recipient_id column (nullable = open trade link, set = direct-target)
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS recipient_id uuid;

CREATE INDEX IF NOT EXISTS trades_recipient_id_idx
  ON public.trades(recipient_id)
  WHERE recipient_id IS NOT NULL;

-- 2. Tighten SELECT policy so direct-target trades are only visible to the chosen recipient
DROP POLICY IF EXISTS "Parties can view their trades" ON public.trades;

CREATE POLICY "Parties can view their trades"
ON public.trades
FOR SELECT
TO authenticated
USING (
  auth.uid() = initiator_id
  OR auth.uid() = responder_id
  OR (recipient_id IS NOT NULL AND auth.uid() = recipient_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);