-- Add sort_order to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.campaigns
)
UPDATE public.campaigns c
SET sort_order = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_campaigns_sort_order ON public.campaigns(sort_order);

-- Add sort_order to redeem_rewards
ALTER TABLE public.redeem_rewards ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.redeem_rewards
)
UPDATE public.redeem_rewards r
SET sort_order = ranked.rn
FROM ranked
WHERE r.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_redeem_rewards_sort_order ON public.redeem_rewards(sort_order);