CREATE OR REPLACE FUNCTION public.get_tier_distribution(_campaign_id text, _limit integer DEFAULT 1000)
RETURNS TABLE(tier_label text, draw_count bigint, total_draws bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH recent AS (
    SELECT tier_label
    FROM public.draws
    WHERE campaign_id = _campaign_id
    ORDER BY created_at DESC
    LIMIT GREATEST(_limit, 1)
  ),
  total AS (SELECT count(*)::bigint AS n FROM recent)
  SELECT r.tier_label, count(*)::bigint AS draw_count, t.n AS total_draws
  FROM recent r CROSS JOIN total t
  GROUP BY r.tier_label, t.n
  ORDER BY r.tier_label;
$function$;

REVOKE ALL ON FUNCTION public.get_tier_distribution(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tier_distribution(text, integer) TO authenticated;