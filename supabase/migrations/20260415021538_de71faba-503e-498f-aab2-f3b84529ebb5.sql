
ALTER TABLE public.tier_prizes ADD COLUMN total integer NOT NULL DEFAULT 1;
ALTER TABLE public.tier_prizes ADD COLUMN remaining integer NOT NULL DEFAULT 1;
