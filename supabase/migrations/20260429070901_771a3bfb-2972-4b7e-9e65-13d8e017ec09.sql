-- Tambah kolom postal_codes (array) ke tabel indonesian_cities
ALTER TABLE public.indonesian_cities
ADD COLUMN IF NOT EXISTS postal_codes TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_indonesian_cities_postal_codes
  ON public.indonesian_cities USING GIN(postal_codes);