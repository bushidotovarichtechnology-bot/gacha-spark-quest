ALTER TABLE public.prize_claims
  ADD COLUMN IF NOT EXISTS destination_area_id TEXT,
  ADD COLUMN IF NOT EXISTS courier_company TEXT,
  ADD COLUMN IF NOT EXISTS courier_service TEXT,
  ADD COLUMN IF NOT EXISTS shipping_eta TEXT;