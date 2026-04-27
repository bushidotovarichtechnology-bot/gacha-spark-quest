CREATE OR REPLACE FUNCTION public.get_trade_item_details(_trade_id uuid)
RETURNS TABLE(
  item_id uuid,
  side text,
  prize_name text,
  image_url text,
  coin_value integer,
  tier_label text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _trade public.trades%ROWTYPE;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _trade FROM public.trades WHERE id = _trade_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'trade_not_found';
  END IF;

  -- Only parties or admin can read item details
  IF _caller <> _trade.initiator_id
     AND _caller IS DISTINCT FROM _trade.responder_id
     AND _caller IS DISTINCT FROM _trade.recipient_id
     AND NOT public.has_role(_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_a_party' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT ui.id, 'initiator'::text AS side, ui.prize_name, ui.image_url, ui.coin_value, ui.tier_label
    FROM public.user_inventory ui
   WHERE ui.id::text IN (SELECT jsonb_array_elements_text(_trade.initiator_items))
  UNION ALL
  SELECT ui.id, 'responder'::text AS side, ui.prize_name, ui.image_url, ui.coin_value, ui.tier_label
    FROM public.user_inventory ui
   WHERE ui.id::text IN (SELECT jsonb_array_elements_text(_trade.responder_items));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_trade_item_details(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_trade_item_details(uuid) TO authenticated;