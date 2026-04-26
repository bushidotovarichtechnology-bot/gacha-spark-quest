-- Add status tracking to coin_gifts
ALTER TABLE public.coin_gifts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'success';
ALTER TABLE public.coin_gifts ADD COLUMN IF NOT EXISTS error_message text;

-- Sanity check: existing rows are completed transfers
UPDATE public.coin_gifts SET status = 'success' WHERE status IS NULL OR status = '';

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS coin_gifts_status_idx ON public.coin_gifts(status);