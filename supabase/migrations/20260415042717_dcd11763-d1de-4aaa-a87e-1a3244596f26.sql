
CREATE TABLE public.coin_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  coins integer NOT NULL,
  price integer NOT NULL,
  icon text NOT NULL DEFAULT 'Coins',
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages" ON public.coin_packages
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert packages" ON public.coin_packages
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update packages" ON public.coin_packages
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete packages" ON public.coin_packages
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_coin_packages_updated_at
  BEFORE UPDATE ON public.coin_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default packages
INSERT INTO public.coin_packages (name, coins, price, icon, is_popular, sort_order) VALUES
  ('Starter', 100, 15000, 'Coins', false, 0),
  ('Value', 500, 65000, 'Zap', true, 1),
  ('Premium', 1200, 130000, 'Sparkles', false, 2),
  ('Whale', 3000, 280000, 'Crown', false, 3);
