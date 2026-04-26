ALTER TABLE public.coin_gifts ADD COLUMN IF NOT EXISTS request_id text;
CREATE UNIQUE INDEX IF NOT EXISTS coin_gifts_request_id_key ON public.coin_gifts (request_id) WHERE request_id IS NOT NULL;