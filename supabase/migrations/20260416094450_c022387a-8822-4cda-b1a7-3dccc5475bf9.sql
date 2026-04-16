-- Create shipping_zones table to store admin-configurable shipping rates
CREATE TABLE public.shipping_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name text NOT NULL,
  zone_number integer NOT NULL UNIQUE,
  provinces text[] NOT NULL DEFAULT '{}',
  regular_price integer NOT NULL DEFAULT 0,
  regular_eta text NOT NULL DEFAULT '3-5 hari',
  express_price integer NOT NULL DEFAULT 0,
  express_eta text NOT NULL DEFAULT '1-2 hari',
  same_day_price integer NOT NULL DEFAULT 0,
  same_day_eta text NOT NULL DEFAULT 'Hari ini',
  same_day_available boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shipping zones" ON public.shipping_zones FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert shipping zones" ON public.shipping_zones FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update shipping zones" ON public.shipping_zones FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete shipping zones" ON public.shipping_zones FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add tracking columns to prize_claims
ALTER TABLE public.prize_claims ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.prize_claims ADD COLUMN IF NOT EXISTS courier_name text;
ALTER TABLE public.prize_claims ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE public.prize_claims ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone;
ALTER TABLE public.prize_claims ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- Enable realtime for prize_claims so users can see live tracking updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.prize_claims;

-- Insert default shipping zones
INSERT INTO public.shipping_zones (zone_name, zone_number, provinces, regular_price, regular_eta, express_price, express_eta, same_day_price, same_day_eta, same_day_available) VALUES
('Jawa', 1, ARRAY['DKI Jakarta','Jawa Barat','Jawa Tengah','Jawa Timur','DI Yogyakarta','Banten'], 9000, '3-5 hari', 18000, '1-2 hari', 30000, 'Hari ini', true),
('Sumatera & Bali', 2, ARRAY['Aceh','Sumatera Utara','Sumatera Barat','Riau','Kepulauan Riau','Jambi','Sumatera Selatan','Bangka Belitung','Bengkulu','Lampung','Bali','Nusa Tenggara Barat'], 15000, '5-7 hari', 28000, '2-3 hari', 0, '', false),
('Kalimantan & Sulawesi', 3, ARRAY['Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Sulawesi Barat','Gorontalo','Nusa Tenggara Timur'], 22000, '5-7 hari', 38000, '3-5 hari', 0, '', false),
('Papua & Maluku', 4, ARRAY['Maluku','Maluku Utara','Papua','Papua Barat','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya'], 35000, '7-14 hari', 55000, '5-7 hari', 0, '', false);
