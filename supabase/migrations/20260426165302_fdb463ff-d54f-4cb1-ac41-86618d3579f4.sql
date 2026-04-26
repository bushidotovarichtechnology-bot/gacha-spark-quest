
-- 1) Harden has_role(): never trust NULL callers.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  -- Reject anonymous callers outright. RLS policies always run with an
  -- authenticated context (or none, in which case access should be denied),
  -- so a NULL caller must never grant role access.
  IF _caller IS NULL THEN
    RETURN false;
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
$function$;

-- 2) Recreate views with security_invoker = true (avoid SECURITY DEFINER views).
DROP VIEW IF EXISTS public.campaign_tiers_public;
CREATE VIEW public.campaign_tiers_public
WITH (security_invoker = true) AS
SELECT id, campaign_id, label, name, image_url, sort_order, created_at
FROM public.campaign_tiers;

DROP VIEW IF EXISTS public.tier_prizes_public;
CREATE VIEW public.tier_prizes_public
WITH (security_invoker = true) AS
SELECT id, tier_id, name, description, image_url, sort_order,
       coin_value, weight_grams, auto_refill, created_at,
       (remaining <= 0) AS is_sold_out
FROM public.tier_prizes;

DROP VIEW IF EXISTS public.user_coins_admin;
CREATE VIEW public.user_coins_admin
WITH (security_invoker = true) AS
SELECT id, user_id, balance, draws_since_tier_a, created_at, updated_at,
       free_draws, active_discount_percent, last_draw_at, last_draw_ip,
       is_banned, ban_reason, banned_at
FROM public.user_coins;

GRANT SELECT ON public.campaign_tiers_public TO anon, authenticated;
GRANT SELECT ON public.tier_prizes_public TO anon, authenticated;
GRANT SELECT ON public.user_coins_admin TO authenticated;

-- 3) Hide profiles.security_pin_hash from client SELECT.
-- Replace the broad owner SELECT policy with a view that excludes the hash,
-- and revoke direct SELECT on the underlying column for client roles.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- New policy: still owner-scoped (so existing UPDATE/INSERT keep working),
-- but clients are blocked from selecting the hash column via column GRANTs below.
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Revoke broad SELECT, then grant SELECT only on non-sensitive columns.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, display_name, phone, recipient_name, address,
  city, province, postal_code, avatar_url, created_at, updated_at
) ON public.profiles TO authenticated;

-- Keep INSERT/UPDATE grants intact for owner writes (RLS still enforces row scope).
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
