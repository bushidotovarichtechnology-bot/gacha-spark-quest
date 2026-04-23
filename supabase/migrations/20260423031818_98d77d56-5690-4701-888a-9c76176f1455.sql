DROP POLICY IF EXISTS "Authenticated users can view prizes" ON public.tier_prizes;
CREATE POLICY "Anyone can view prizes" ON public.tier_prizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can view tiers" ON public.campaign_tiers;
CREATE POLICY "Anyone can view tiers" ON public.campaign_tiers FOR SELECT USING (true);