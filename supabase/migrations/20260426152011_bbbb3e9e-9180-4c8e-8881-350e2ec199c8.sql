-- Add initiator_ip to trades so we can capture it at creation time
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS initiator_ip text,
  ADD COLUMN IF NOT EXISTS initiator_user_agent text;

-- Update the atomic execute RPC to write initiator_ip from the trade row
CREATE OR REPLACE FUNCTION public._internal_execute_trade(
  _trade_id uuid,
  _caller_id uuid,
  _responder_items jsonb,
  _caller_ip text,
  _user_agent text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trade public.trades%ROWTYPE;
  _initiator_items_arr uuid[];
  _responder_items_arr uuid[];
  _initiator_owned_count integer;
  _responder_owned_count integer;
  _initiator_tier_match integer;
  _responder_tier_match integer;
  _initiator_balance integer;
  _responder_balance integer;
  _gas_fee constant integer := 5;
  _new_initiator_balance integer;
  _new_responder_balance integer;
  _exchanged jsonb;
BEGIN
  SELECT * INTO _trade FROM public.trades WHERE id = _trade_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'trade_not_found' USING ERRCODE = 'P0001'; END IF;

  IF _trade.status <> 'pending' THEN RAISE EXCEPTION 'trade_not_pending' USING ERRCODE = 'P0001'; END IF;
  IF _trade.expires_at IS NOT NULL AND _trade.expires_at < now() THEN
    UPDATE public.trades SET status = 'expired', updated_at = now() WHERE id = _trade_id;
    RAISE EXCEPTION 'trade_not_pending' USING ERRCODE = 'P0001';
  END IF;

  IF _trade.tier_label NOT IN ('S','A','B') THEN RAISE EXCEPTION 'tier_locked' USING ERRCODE = 'P0001'; END IF;

  IF _trade.responder_id IS NULL THEN
    IF _caller_id = _trade.initiator_id THEN RAISE EXCEPTION 'self_trade_forbidden' USING ERRCODE = 'P0001'; END IF;
    IF _responder_items IS NULL OR jsonb_array_length(_responder_items) = 0 THEN
      RAISE EXCEPTION 'missing_responder_items' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.trades
       SET responder_id = _caller_id, responder_items = _responder_items, updated_at = now()
     WHERE id = _trade_id RETURNING * INTO _trade;
  ELSIF _caller_id <> _trade.responder_id THEN
    RAISE EXCEPTION 'not_a_party' USING ERRCODE = 'P0001';
  ELSE
    IF _responder_items IS NOT NULL AND jsonb_array_length(_responder_items) > 0 THEN
      UPDATE public.trades
         SET responder_items = _responder_items, updated_at = now()
       WHERE id = _trade_id RETURNING * INTO _trade;
    END IF;
  END IF;

  SELECT array(SELECT (jsonb_array_elements_text(_trade.initiator_items))::uuid) INTO _initiator_items_arr;
  SELECT array(SELECT (jsonb_array_elements_text(_trade.responder_items))::uuid) INTO _responder_items_arr;

  IF array_length(_initiator_items_arr, 1) IS NULL OR array_length(_responder_items_arr, 1) IS NULL THEN
    RAISE EXCEPTION 'missing_responder_items' USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1 FROM public.user_inventory WHERE id = ANY(_initiator_items_arr) FOR UPDATE;
  PERFORM 1 FROM public.user_inventory WHERE id = ANY(_responder_items_arr) FOR UPDATE;

  SELECT count(*) INTO _initiator_owned_count FROM public.user_inventory
   WHERE id = ANY(_initiator_items_arr) AND user_id = _trade.initiator_id;
  SELECT count(*) INTO _responder_owned_count FROM public.user_inventory
   WHERE id = ANY(_responder_items_arr) AND user_id = _trade.responder_id;

  IF _initiator_owned_count <> array_length(_initiator_items_arr, 1)
     OR _responder_owned_count <> array_length(_responder_items_arr, 1) THEN
    RAISE EXCEPTION 'items_ownership_failed' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO _initiator_tier_match FROM public.user_inventory
   WHERE id = ANY(_initiator_items_arr) AND tier_label = _trade.tier_label;
  SELECT count(*) INTO _responder_tier_match FROM public.user_inventory
   WHERE id = ANY(_responder_items_arr) AND tier_label = _trade.tier_label;

  IF _initiator_tier_match <> array_length(_initiator_items_arr, 1)
     OR _responder_tier_match <> array_length(_responder_items_arr, 1) THEN
    RAISE EXCEPTION 'tier_mismatch' USING ERRCODE = 'P0001';
  END IF;

  SELECT balance INTO _initiator_balance FROM public.user_coins WHERE user_id = _trade.initiator_id FOR UPDATE;
  SELECT balance INTO _responder_balance FROM public.user_coins WHERE user_id = _trade.responder_id FOR UPDATE;

  IF _initiator_balance IS NULL OR _responder_balance IS NULL THEN
    RAISE EXCEPTION 'items_ownership_failed' USING ERRCODE = 'P0001';
  END IF;
  IF _initiator_balance < _gas_fee OR _responder_balance < _gas_fee THEN
    RAISE EXCEPTION 'insufficient_gas_fee' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.user_inventory SET user_id = _trade.responder_id WHERE id = ANY(_initiator_items_arr);
  UPDATE public.user_inventory SET user_id = _trade.initiator_id WHERE id = ANY(_responder_items_arr);

  UPDATE public.user_coins SET balance = balance - _gas_fee, updated_at = now()
   WHERE user_id = _trade.initiator_id RETURNING balance INTO _new_initiator_balance;
  UPDATE public.user_coins SET balance = balance - _gas_fee, updated_at = now()
   WHERE user_id = _trade.responder_id RETURNING balance INTO _new_responder_balance;

  INSERT INTO public.coin_ledger(user_id, entry_type, amount, balance_after, description, reference_id, metadata)
  VALUES
    (_trade.initiator_id, 'trade_gas_fee', -_gas_fee, _new_initiator_balance,
     'Gas fee P2P trade', _trade.id::text,
     jsonb_build_object('trade_id', _trade.id, 'role', 'initiator', 'tier', _trade.tier_label)),
    (_trade.responder_id, 'trade_gas_fee', -_gas_fee, _new_responder_balance,
     'Gas fee P2P trade', _trade.id::text,
     jsonb_build_object('trade_id', _trade.id, 'role', 'responder', 'tier', _trade.tier_label));

  UPDATE public.trades SET status = 'accepted', responded_at = now(), updated_at = now() WHERE id = _trade_id;

  _exchanged := jsonb_build_object(
    'initiator_items', _trade.initiator_items,
    'responder_items', _trade.responder_items,
    'tier', _trade.tier_label
  );
  INSERT INTO public.trade_history(
    trade_id, initiator_id, responder_id, tier_label, items_exchanged,
    gas_fee, outcome, error_reason, initiator_ip, responder_ip, user_agent
  ) VALUES (
    _trade.id, _trade.initiator_id, _trade.responder_id, _trade.tier_label, _exchanged,
    _gas_fee * 2, 'success', NULL,
    _trade.initiator_ip,        -- captured at trade creation
    _caller_ip,                  -- responder IP at execution
    COALESCE(_user_agent, _trade.initiator_user_agent)
  );

  RETURN jsonb_build_object(
    'success', true, 'trade_id', _trade.id, 'tier', _trade.tier_label,
    'gas_fee_each', _gas_fee,
    'new_balances', jsonb_build_object('initiator', _new_initiator_balance, 'responder', _new_responder_balance)
  );
END;
$$;

REVOKE ALL ON FUNCTION public._internal_execute_trade(uuid, uuid, jsonb, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._internal_execute_trade(uuid, uuid, jsonb, text, text) FROM anon;
REVOKE ALL ON FUNCTION public._internal_execute_trade(uuid, uuid, jsonb, text, text) FROM authenticated;