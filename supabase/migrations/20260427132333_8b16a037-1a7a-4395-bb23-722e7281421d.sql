-- Set probability per tier and prize for all campaigns:
-- Tier A: each prize 0.05% (0.0005)
-- Tier B: each prize 0.1% (0.001)
-- Tier C: remainder split evenly across prizes
-- Tier S: 0 (kept as-is)
--
-- System formula: P(prize) = (tier.weight / Σtier.weight) × (prize.weight / Σprize.weight in tier)
-- Strategy: set Σtier.weight = 1 per campaign by using:
--   A.weight = 0.0005 * count(A_prizes)
--   B.weight = 0.001  * count(B_prizes)
--   C.weight = 1 - A.weight - B.weight
--   S.weight = 0
-- All prize.weight inside a tier = 1 (uniform), so P(prize) = tier.weight / count_in_tier.

WITH prize_counts AS (
  SELECT ct.id AS tier_id, ct.campaign_id, ct.label,
         COUNT(tp.id) AS prize_count
  FROM public.campaign_tiers ct
  LEFT JOIN public.tier_prizes tp ON tp.tier_id = ct.id
  GROUP BY ct.id, ct.campaign_id, ct.label
),
campaign_counts AS (
  SELECT campaign_id,
         COALESCE(SUM(prize_count) FILTER (WHERE label = 'A'), 0) AS n_a,
         COALESCE(SUM(prize_count) FILTER (WHERE label = 'B'), 0) AS n_b
  FROM prize_counts
  GROUP BY campaign_id
)
UPDATE public.campaign_tiers ct
SET probability_weight = CASE
  WHEN ct.label = 'S' THEN 0
  WHEN ct.label = 'A' THEN 0.0005 * pc.prize_count
  WHEN ct.label = 'B' THEN 0.001  * pc.prize_count
  WHEN ct.label = 'C' THEN GREATEST(0, 1 - (0.0005 * cc.n_a) - (0.001 * cc.n_b))
  ELSE ct.probability_weight
END
FROM prize_counts pc
JOIN campaign_counts cc ON cc.campaign_id = pc.campaign_id
WHERE pc.tier_id = ct.id;

-- Make every prize within its tier weighted equally (uniform within tier)
UPDATE public.tier_prizes SET probability_weight = 1;