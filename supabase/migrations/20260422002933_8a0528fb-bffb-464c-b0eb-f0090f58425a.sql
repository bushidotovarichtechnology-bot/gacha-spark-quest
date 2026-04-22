-- 1. Remove user INSERT policy on user_inventory (server-side secure_draw RPC handles inserts via SECURITY DEFINER)
DROP POLICY IF EXISTS "Users can insert own inventory" ON public.user_inventory;

-- 2. Restrict tier_prizes SELECT to authenticated users (hide live stock counts from anonymous scrapers)
DROP POLICY IF EXISTS "Anyone can view prizes" ON public.tier_prizes;
CREATE POLICY "Authenticated users can view prizes"
ON public.tier_prizes FOR SELECT
TO authenticated
USING (true);

-- 3. Restrict campaign_tiers SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view tiers" ON public.campaign_tiers;
CREATE POLICY "Authenticated users can view tiers"
ON public.campaign_tiers FOR SELECT
TO authenticated
USING (true);