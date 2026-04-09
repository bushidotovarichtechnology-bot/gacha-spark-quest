
ALTER TABLE public.campaign_tiers ADD COLUMN image_url text NOT NULL DEFAULT '';
ALTER TABLE public.tier_prizes ADD COLUMN image_url text NOT NULL DEFAULT '';
