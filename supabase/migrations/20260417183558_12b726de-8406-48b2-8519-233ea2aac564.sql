CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _reward record;
  _total_remaining bigint;
  _to_deduct integer;
  _ticket record;
  _deduct integer;
  _claim_id uuid;
  _inv_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Lock reward row to prevent race on stock
  SELECT * INTO _reward FROM public.redeem_rewards
   WHERE id = _reward_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reward_not_found';
  END IF;

  IF NOT _reward.is_active THEN
    RAISE EXCEPTION 'reward_inactive';
  END IF;

  IF _reward.stock <= 0 THEN
    RAISE EXCEPTION 'out_of_stock';
  END IF;

  -- Lock & sum user's tickets of matching type
  SELECT COALESCE(SUM(remaining), 0) INTO _total_remaining
    FROM public.redeem_tickets
   WHERE user_id = _user_id
     AND ticket_type = _reward.ticket_type
     AND remaining > 0
   FOR UPDATE;

  IF _total_remaining < _reward.ticket_cost THEN
    RAISE EXCEPTION 'insufficient_tickets';
  END IF;

  -- Deduct tickets oldest-first
  _to_deduct := _reward.ticket_cost;
  FOR _ticket IN
    SELECT id, remaining FROM public.redeem_tickets
     WHERE user_id = _user_id
       AND ticket_type = _reward.ticket_type
       AND remaining > 0
     ORDER BY created_at ASC
  LOOP
    EXIT WHEN _to_deduct <= 0;
    _deduct := LEAST(_to_deduct, _ticket.remaining);
    UPDATE public.redeem_tickets
       SET remaining = remaining - _deduct
     WHERE id = _ticket.id;
    _to_deduct := _to_deduct - _deduct;
  END LOOP;

  IF _to_deduct > 0 THEN
    RAISE EXCEPTION 'insufficient_tickets';
  END IF;

  -- Decrement stock
  UPDATE public.redeem_rewards
     SET stock = stock - 1, updated_at = now()
   WHERE id = _reward_id;

  -- Create claim
  INSERT INTO public.redeem_claims(user_id, reward_id, reward_name, tickets_spent)
  VALUES (_user_id, _reward_id, _reward.name, _reward.ticket_cost)
  RETURNING id INTO _claim_id;

  -- Add to inventory
  INSERT INTO public.user_inventory(user_id, prize_name, tier_label, campaign_id, campaign_name, image_url, coin_value, won_at)
  VALUES (_user_id, _reward.name, 'A', 'redeem-store', 'Bushido Tiket Store',
          COALESCE(_reward.image_url, ''), 0, now())
  RETURNING id INTO _inv_id;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', _claim_id,
    'inventory_id', _inv_id,
    'reward_name', _reward.name,
    'tickets_spent', _reward.ticket_cost,
    'remaining_stock', _reward.stock - 1
  );
END;
$function$;