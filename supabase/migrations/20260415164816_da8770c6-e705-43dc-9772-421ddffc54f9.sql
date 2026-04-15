ALTER TABLE public.user_coins ADD COLUMN free_draws integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_coins ADD COLUMN active_discount_percent integer NOT NULL DEFAULT 0;