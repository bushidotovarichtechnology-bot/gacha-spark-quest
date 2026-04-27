-- Make public views run as owner so they bypass admin-only RLS on the base tables.
-- These views intentionally omit sensitive columns (remaining, total, probability_weight)
-- so it's safe for anon/authenticated to read them.
ALTER VIEW public.campaign_tiers_public SET (security_invoker = false);
ALTER VIEW public.tier_prizes_public SET (security_invoker = false);

GRANT SELECT ON public.campaign_tiers_public TO anon, authenticated;
GRANT SELECT ON public.tier_prizes_public TO anon, authenticated;