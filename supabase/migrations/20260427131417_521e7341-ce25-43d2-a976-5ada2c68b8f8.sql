DROP VIEW IF EXISTS public.tier_prizes_public CASCADE;
DROP VIEW IF EXISTS public.campaign_tiers_public CASCADE;

-- Use security definer (default) so the views can read base tables
-- regardless of caller's RLS — they only expose safe columns.
CREATE VIEW public.campaign_tiers_public AS
SELECT
  id,
  campaign_id,
  label,
  name,
  image_url,
  sort_order,
  total,
  created_at
FROM public.campaign_tiers;

CREATE VIEW public.tier_prizes_public AS
SELECT
  tp.id,
  tp.tier_id,
  tp.name,
  tp.description,
  tp.image_url,
  tp.sort_order,
  tp.coin_value,
  tp.weight_grams,
  tp.auto_refill,
  tp.is_digital,
  tp.total,
  (tp.remaining <= 0) AS is_sold_out,
  tp.created_at
FROM public.tier_prizes tp;

GRANT SELECT ON public.campaign_tiers_public TO anon, authenticated;
GRANT SELECT ON public.tier_prizes_public TO anon, authenticated;