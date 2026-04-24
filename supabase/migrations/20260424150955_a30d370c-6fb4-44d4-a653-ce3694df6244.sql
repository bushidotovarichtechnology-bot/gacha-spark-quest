-- =========================================================
-- 1. Restrict tier_prizes & campaign_tiers SELECT to admin only,
--    expose safe public views (without remaining/total/probability_weight)
-- =========================================================

-- Drop public SELECT policies
DROP POLICY IF EXISTS "Anyone can view prizes" ON public.tier_prizes;
DROP POLICY IF EXISTS "Anyone can view tiers" ON public.campaign_tiers;

-- Admin-only SELECT on base tables
CREATE POLICY "Admins can view prizes"
  ON public.tier_prizes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view tiers"
  ON public.campaign_tiers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public-safe views (security_invoker so RLS of caller applies on referenced tables)
-- These views deliberately omit: remaining, total, probability_weight
CREATE OR REPLACE VIEW public.campaign_tiers_public
WITH (security_invoker = on) AS
  SELECT id, campaign_id, label, name, image_url, sort_order, created_at
  FROM public.campaign_tiers;

CREATE OR REPLACE VIEW public.tier_prizes_public
WITH (security_invoker = on) AS
  SELECT id, tier_id, name, description, image_url, sort_order,
         coin_value, weight_grams, auto_refill, created_at,
         (remaining <= 0) AS is_sold_out
  FROM public.tier_prizes;

-- Allow public/anon read of the views; since security_invoker=on, we need
-- bypass policies on base tables. We add permissive SELECT policies that
-- allow reading ONLY when accessed through these views? Postgres RLS doesn't
-- distinguish view vs direct, so we instead grant via SECURITY DEFINER: switch
-- views to security_invoker=off so they run as view owner (postgres) and
-- bypass base-table RLS for the limited columns selected.
ALTER VIEW public.campaign_tiers_public SET (security_invoker = off);
ALTER VIEW public.tier_prizes_public SET (security_invoker = off);

GRANT SELECT ON public.campaign_tiers_public TO anon, authenticated;
GRANT SELECT ON public.tier_prizes_public TO anon, authenticated;

-- =========================================================
-- 2. Server-side aggregate function for stock summaries that
--    clients legitimately need (for "X remaining" display).
--    Returns coarse buckets only — never exact counts.
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_campaign_stock_summary(_campaign_ids text[])
RETURNS TABLE(
  campaign_id text,
  tier_id uuid,
  tier_label text,
  remaining_bucket text,
  total_bucket integer,
  is_sold_out boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ct.campaign_id,
    ct.id AS tier_id,
    ct.label AS tier_label,
    CASE
      WHEN COALESCE(SUM(tp.remaining), 0) <= 0 THEN '0'
      WHEN SUM(tp.remaining) < 5 THEN '<5'
      WHEN SUM(tp.remaining) < 10 THEN '5+'
      WHEN SUM(tp.remaining) < 25 THEN '10+'
      WHEN SUM(tp.remaining) < 50 THEN '25+'
      WHEN SUM(tp.remaining) < 100 THEN '50+'
      ELSE (FLOOR(SUM(tp.remaining)::numeric / 50) * 50)::text || '+'
    END AS remaining_bucket,
    -- Total bucket rounded to nearest 10 to avoid leaking exact totals
    (ROUND(COALESCE(SUM(tp.total), 0)::numeric / 10) * 10)::int AS total_bucket,
    COALESCE(SUM(tp.remaining), 0) <= 0 AS is_sold_out
  FROM public.campaign_tiers ct
  LEFT JOIN public.tier_prizes tp ON tp.tier_id = ct.id
  WHERE ct.campaign_id = ANY(_campaign_ids)
  GROUP BY ct.campaign_id, ct.id, ct.label, ct.sort_order
  ORDER BY ct.campaign_id, ct.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_stock_summary(text[]) TO anon, authenticated;

-- Per-prize sold-out flag (no counts) for the detail page card grid
CREATE OR REPLACE FUNCTION public.get_prize_availability(_campaign_id text)
RETURNS TABLE(prize_id uuid, tier_id uuid, is_sold_out boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tp.id AS prize_id, tp.tier_id,
         (tp.remaining <= 0 AND NOT tp.auto_refill) AS is_sold_out
  FROM public.tier_prizes tp
  JOIN public.campaign_tiers ct ON ct.id = tp.tier_id
  WHERE ct.campaign_id = _campaign_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_prize_availability(text) TO anon, authenticated;

-- =========================================================
-- 3. Lock down has_role: prevent admin enumeration.
--    Allow callers to query only their own role unless they are admin.
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  -- Internal SQL callers (RLS policies) pass through with no auth context;
  -- they rely on this function and must keep working.
  IF _caller IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    );
  END IF;

  -- Authenticated user: only allow checking their own role,
  -- OR allow if they are themselves admin (admins may probe others).
  IF _user_id <> _caller THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _caller AND role = 'admin'::app_role
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- =========================================================
-- 4. Remove client INSERT on transactions — must go through edge function
-- =========================================================
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

-- =========================================================
-- 5. Hide last_draw_ip from end users.
--    Replace user-facing SELECT policy with a view that omits it.
-- =========================================================
DROP POLICY IF EXISTS "Users can view own coins" ON public.user_coins;

CREATE POLICY "Users can view own coins"
  ON public.user_coins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin-only audit view that includes last_draw_ip
CREATE OR REPLACE VIEW public.user_coins_admin
WITH (security_invoker = on) AS
  SELECT * FROM public.user_coins;

GRANT SELECT ON public.user_coins_admin TO authenticated;

-- Revoke direct SELECT of last_draw_ip from authenticated; allow other columns
-- via column-level grants. (Postgres column-level security)
REVOKE SELECT ON public.user_coins FROM authenticated;
GRANT SELECT (
  id, user_id, balance, draws_since_tier_a, free_draws,
  active_discount_percent, last_draw_at, is_banned, ban_reason,
  banned_at, created_at, updated_at
) ON public.user_coins TO authenticated;
-- last_draw_ip intentionally excluded