CREATE TABLE public.indonesian_cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  province text NOT NULL,
  city text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (province, city)
);

CREATE INDEX idx_indonesian_cities_province ON public.indonesian_cities(province);

ALTER TABLE public.indonesian_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cities"
ON public.indonesian_cities FOR SELECT
USING (true);

CREATE POLICY "Admins can insert cities"
ON public.indonesian_cities FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cities"
ON public.indonesian_cities FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cities"
ON public.indonesian_cities FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));