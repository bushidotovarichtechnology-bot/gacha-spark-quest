ALTER TABLE public.prize_claims ADD COLUMN shipping_cost integer NOT NULL DEFAULT 0;
ALTER TABLE public.prize_claims ADD COLUMN shipping_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.prize_claims ADD COLUMN shipping_order_id text;