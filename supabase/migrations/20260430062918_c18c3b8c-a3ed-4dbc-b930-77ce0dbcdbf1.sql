
-- Set tier A weight = 0.0003 * (number of A prizes in that tier)
UPDATE public.campaign_tiers ct
SET probability_weight = 0.0003 * sub.cnt
FROM (
  SELECT tier_id, COUNT(*) AS cnt
  FROM public.tier_prizes
  GROUP BY tier_id
) sub
WHERE ct.id = sub.tier_id AND ct.label = 'A';

-- Set tier B weight = 0.0005 * (number of B prizes in that tier)
UPDATE public.campaign_tiers ct
SET probability_weight = 0.0005 * sub.cnt
FROM (
  SELECT tier_id, COUNT(*) AS cnt
  FROM public.tier_prizes
  GROUP BY tier_id
) sub
WHERE ct.id = sub.tier_id AND ct.label = 'B';

-- Tier S stays at 0
UPDATE public.campaign_tiers SET probability_weight = 0 WHERE label = 'S';

-- Tier C absorbs the remainder so total per campaign = 1
UPDATE public.campaign_tiers ct
SET probability_weight = GREATEST(0, 1 - COALESCE(sub.other_total, 0))
FROM (
  SELECT campaign_id, SUM(probability_weight) AS other_total
  FROM public.campaign_tiers
  WHERE label IN ('S','A','B')
  GROUP BY campaign_id
) sub
WHERE ct.campaign_id = sub.campaign_id AND ct.label = 'C';
