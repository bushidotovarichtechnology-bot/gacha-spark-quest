
ALTER TABLE public.coin_packages
  ADD COLUMN discount_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN discount_start timestamp with time zone,
  ADD COLUMN discount_end timestamp with time zone,
  ADD COLUMN bonus_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN bonus_label text NOT NULL DEFAULT '';
