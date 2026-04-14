
-- Table for tracking tickets earned from gacha draws
CREATE TABLE public.redeem_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  campaign_id text NOT NULL,
  draw_id uuid NOT NULL,
  ticket_type text NOT NULL DEFAULT 'standard',
  quantity integer NOT NULL DEFAULT 1,
  remaining integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.redeem_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.redeem_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tickets" ON public.redeem_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tickets" ON public.redeem_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON public.redeem_tickets FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage tickets" ON public.redeem_tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Table for rewards that can be redeemed with tickets
CREATE TABLE public.redeem_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  ticket_cost integer NOT NULL DEFAULT 10,
  ticket_type text NOT NULL DEFAULT 'standard',
  stock integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.redeem_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards" ON public.redeem_rewards FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert rewards" ON public.redeem_rewards FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update rewards" ON public.redeem_rewards FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete rewards" ON public.redeem_rewards FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Table for tracking redemptions
CREATE TABLE public.redeem_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reward_id uuid NOT NULL REFERENCES public.redeem_rewards(id),
  reward_name text NOT NULL,
  tickets_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.redeem_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON public.redeem_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own claims" ON public.redeem_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all claims" ON public.redeem_claims FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update claims" ON public.redeem_claims FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to get user's total available tickets by type
CREATE OR REPLACE FUNCTION public.get_user_ticket_balance(_user_id uuid)
RETURNS TABLE(ticket_type text, total_remaining bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ticket_type, SUM(remaining)::bigint AS total_remaining
  FROM public.redeem_tickets
  WHERE user_id = _user_id AND remaining > 0
  GROUP BY ticket_type;
$$;
