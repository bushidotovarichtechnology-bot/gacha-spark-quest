
-- Create draws table
CREATE TABLE public.draws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id TEXT NOT NULL,
  tier_label TEXT NOT NULL,
  prize_name TEXT NOT NULL,
  coin_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own draws" ON public.draws
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own draws" ON public.draws
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all draws" ON public.draws
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX idx_draws_campaign ON public.draws(campaign_id);
CREATE INDEX idx_draws_user ON public.draws(user_id);
CREATE INDEX idx_draws_created ON public.draws(created_at DESC);

-- Admin stats function
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'total_draws', (SELECT count(*) FROM public.draws),
    'total_campaigns', (SELECT count(*) FROM public.campaigns WHERE is_active = true),
    'draws_today', (SELECT count(*) FROM public.draws WHERE created_at >= CURRENT_DATE),
    'draws_this_week', (SELECT count(*) FROM public.draws WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
  );
$$;

-- Popular campaigns function
CREATE OR REPLACE FUNCTION public.get_popular_campaigns(lim INTEGER DEFAULT 5)
RETURNS TABLE(campaign_id TEXT, campaign_title TEXT, draw_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.campaign_id, c.title AS campaign_title, count(*) AS draw_count
  FROM public.draws d
  JOIN public.campaigns c ON c.id = d.campaign_id
  GROUP BY d.campaign_id, c.title
  ORDER BY draw_count DESC
  LIMIT lim;
$$;
