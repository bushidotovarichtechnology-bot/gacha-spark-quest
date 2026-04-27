ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_status_chk;
ALTER TABLE public.trades ADD CONSTRAINT trades_status_chk
  CHECK (status = ANY (ARRAY['pending'::text, 'awaiting_initiator'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text, 'expired'::text]));