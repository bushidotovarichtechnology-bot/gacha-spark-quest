CREATE OR REPLACE FUNCTION public.get_campaign_stock_summary(_campaign_ids text[])
 RETURNS TABLE(campaign_id text, tier_id uuid, tier_label text, remaining_bucket text, total_bucket integer, is_sold_out boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    ct.campaign_id,
    ct.id AS tier_id,
    ct.label AS tier_label,
    COALESCE(SUM(tp.remaining), 0)::text AS remaining_bucket,
    COALESCE(SUM(tp.total), 0)::int AS total_bucket,
    COALESCE(SUM(tp.remaining), 0) <= 0 AS is_sold_out
  FROM public.campaign_tiers ct
  LEFT JOIN public.tier_prizes tp ON tp.tier_id = ct.id
  WHERE ct.campaign_id = ANY(_campaign_ids)
  GROUP BY ct.campaign_id, ct.id, ct.label, ct.sort_order
  ORDER BY ct.campaign_id, ct.sort_order;
$function$;