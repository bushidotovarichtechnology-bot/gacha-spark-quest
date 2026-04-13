
CREATE TABLE public.pity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  threshold integer NOT NULL DEFAULT 10,
  guaranteed_tier text NOT NULL DEFAULT 'A',
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id)
);

ALTER TABLE public.pity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pity settings"
ON public.pity_settings FOR SELECT TO public
USING (true);

CREATE POLICY "Admins can insert pity settings"
ON public.pity_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pity settings"
ON public.pity_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pity settings"
ON public.pity_settings FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_pity_settings_updated_at
BEFORE UPDATE ON public.pity_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
