
-- User coin balance
CREATE TABLE public.user_coins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  draws_since_tier_a INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coins" ON public.user_coins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coins" ON public.user_coins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coins" ON public.user_coins FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all coins" ON public.user_coins FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all coins" ON public.user_coins FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- User inventory
CREATE TABLE public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prize_name TEXT NOT NULL,
  tier_label TEXT NOT NULL,
  campaign_id TEXT NOT NULL DEFAULT '',
  campaign_name TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  coin_value INTEGER NOT NULL DEFAULT 0,
  won_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory" ON public.user_inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON public.user_inventory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON public.user_inventory FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all inventory" ON public.user_inventory FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-create user_coins row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_coins (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updated_at on user_coins
CREATE TRIGGER update_user_coins_updated_at
BEFORE UPDATE ON public.user_coins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
