
CREATE OR REPLACE FUNCTION public.get_pity_trend(days_back integer DEFAULT 90)
RETURNS TABLE(date date, pity_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_at::date AS date, count(*) AS pity_count
  FROM public.draws
  WHERE is_pity = true
    AND created_at >= (CURRENT_DATE - (days_back || ' days')::interval)
  GROUP BY created_at::date
  ORDER BY date;
$$;
