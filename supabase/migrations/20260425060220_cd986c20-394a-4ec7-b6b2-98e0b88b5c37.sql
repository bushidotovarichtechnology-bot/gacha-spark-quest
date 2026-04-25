-- Promo banners untuk carousel di homepage
CREATE TABLE public.promo_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

-- Public dapat melihat banner yang aktif & dalam jendela waktu
CREATE POLICY "Public can view active promo banners"
ON public.promo_banners
FOR SELECT
USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now())
);

-- Admin full access
CREATE POLICY "Admins can view all promo banners"
ON public.promo_banners
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert promo banners"
ON public.promo_banners
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update promo banners"
ON public.promo_banners
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete promo banners"
ON public.promo_banners
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_promo_banners_updated_at
BEFORE UPDATE ON public.promo_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_promo_banners_active_sort ON public.promo_banners (is_active, sort_order);

-- Storage bucket untuk gambar promo
INSERT INTO storage.buckets (id, name, public)
VALUES ('promo-banners', 'promo-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view promo banner images"
ON storage.objects FOR SELECT
USING (bucket_id = 'promo-banners');

CREATE POLICY "Admins can upload promo banner images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update promo banner images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete promo banner images"
ON storage.objects FOR DELETE
USING (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'));