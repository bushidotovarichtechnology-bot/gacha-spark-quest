-- Expose probability_weight via public views so the frontend can display
-- accurate per-prize odds to anonymous and authenticated users.
DROP VIEW IF EXISTS public.tier_prizes_public CASCADE;
DROP VIEW IF EXISTS public.campaign_tiers_public CASCADE;

CREATE VIEW public.campaign_tiers_public AS
SELECT
  ct.id,
  ct.campaign_id,
  ct.label,
  ct.name,
  ct.image_url,
  ct.sort_order,
  ct.total,
  ct.probability_weight,
  (ct.remaining <= 0) AS is_sold_out,
  ct.created_at
FROM public.campaign_tiers ct;

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
  tp.total,
  tp.probability_weight,
  (tp.remaining <= 0) AS is_sold_out,
  tp.created_at
FROM public.tier_prizes tp;

GRANT SELECT ON public.campaign_tiers_public TO anon, authenticated;
GRANT SELECT ON public.tier_prizes_public TO anon, authenticated;