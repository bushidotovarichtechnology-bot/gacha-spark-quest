-- 1. Critical: remove user INSERT/UPDATE on redeem_tickets (server-side secure_draw RPC handles inserts)
DROP POLICY IF EXISTS "Users can insert own tickets" ON public.redeem_tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON public.redeem_tickets;

-- 2. Hide last_draw_ip from non-admin selects via column-level revoke
-- Recreate user-facing SELECT policy to exclude IP by replacing with a view-friendly approach:
-- Simplest: revoke column access from authenticated for last_draw_ip
REVOKE SELECT (last_draw_ip) ON public.user_coins FROM authenticated;
REVOKE SELECT (last_draw_ip) ON public.user_coins FROM anon;