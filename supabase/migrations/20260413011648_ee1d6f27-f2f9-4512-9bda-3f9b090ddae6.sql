
CREATE TABLE public.prize_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prize_name TEXT NOT NULL,
  tier_label TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  coin_value INTEGER NOT NULL DEFAULT 0,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  shipping_method TEXT NOT NULL DEFAULT 'regular',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prize_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON public.prize_claims
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims" ON public.prize_claims
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims" ON public.prize_claims
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all claims" ON public.prize_claims
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_prize_claims_updated_at
  BEFORE UPDATE ON public.prize_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
