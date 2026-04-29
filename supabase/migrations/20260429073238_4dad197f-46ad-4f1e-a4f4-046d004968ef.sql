
-- Add district and village columns to prize_claims
ALTER TABLE public.prize_claims
  ADD COLUMN IF NOT EXISTS district TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS village TEXT NOT NULL DEFAULT '';

-- Add district and village columns to profiles for autofill
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS district TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS village TEXT NOT NULL DEFAULT '';
