
-- 1) Set search_path on flagged functions
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- 2) Recreate public views with security_invoker so RLS of caller applies
DROP VIEW IF EXISTS public.campaign_tiers_public;
CREATE VIEW public.campaign_tiers_public
  WITH (security_invoker = true) AS
  SELECT id, campaign_id, label, name, image_url, sort_order, total, probability_weight,
         (remaining <= 0) AS is_sold_out, created_at
  FROM public.campaign_tiers;

DROP VIEW IF EXISTS public.tier_prizes_public;
CREATE VIEW public.tier_prizes_public
  WITH (security_invoker = true) AS
  SELECT id, tier_id, name, description, image_url, sort_order, coin_value, weight_grams,
         auto_refill, total, probability_weight, (remaining <= 0) AS is_sold_out, created_at
  FROM public.tier_prizes;

GRANT SELECT ON public.campaign_tiers_public TO anon, authenticated;
GRANT SELECT ON public.tier_prizes_public TO anon, authenticated;

-- 3) Public SELECT policies scoped to active campaigns (sensitive `remaining`
--    is only reached via *_public views which exclude it explicitly).
GRANT SELECT ON public.campaign_tiers TO anon, authenticated;
GRANT SELECT ON public.tier_prizes TO anon, authenticated;

CREATE POLICY "Public can view tiers of active campaigns"
  ON public.campaign_tiers FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
     WHERE c.id = campaign_tiers.campaign_id AND c.is_active = true
  ));

CREATE POLICY "Public can view prizes of active campaigns"
  ON public.tier_prizes FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_tiers ct
      JOIN public.campaigns c ON c.id = ct.campaign_id
     WHERE ct.id = tier_prizes.tier_id AND c.is_active = true
  ));

-- 4) Revoke EXECUTE on internal SECURITY DEFINER helpers.
REVOKE EXECUTE ON FUNCTION public._internal_execute_trade(uuid, uuid, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._rate_up_multiplier(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_unpaid_claims() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_pending_transactions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_trades() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_transaction_settlement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_prize_claim_shipping() FROM PUBLIC, anon, authenticated;

-- 5) Digital code exposure: revoke column SELECT, expose via RPC.
REVOKE SELECT (digital_code) ON public.user_inventory FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_inventory_codes()
RETURNS TABLE(inventory_id uuid, digital_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, digital_code
    FROM public.user_inventory
   WHERE user_id = auth.uid()
     AND digital_code IS NOT NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_inventory_codes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_inventory_codes() TO authenticated;

-- 6) Atomic top-up settlement RPC (prevents double-crediting race).
CREATE OR REPLACE FUNCTION public.settle_transaction_atomic(
  _order_id text,
  _new_status text,
  _payment_type text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tx record;
  _credited boolean := false;
BEGIN
  IF _new_status IS NULL OR _order_id IS NULL THEN
    RAISE EXCEPTION 'invalid_params';
  END IF;

  -- Atomic: only claim rows not already settled.
  UPDATE public.transactions
     SET status = _new_status,
         payment_type = COALESCE(_payment_type, payment_type),
         updated_at = now()
   WHERE order_id = _order_id
     AND status <> 'settlement'
   RETURNING * INTO _tx;

  IF NOT FOUND THEN
    -- Either already settled or missing. Return current state without crediting.
    SELECT * INTO _tx FROM public.transactions WHERE order_id = _order_id;
    RETURN jsonb_build_object(
      'credited', false,
      'status', COALESCE(_tx.status, 'not_found'),
      'already_settled', COALESCE(_tx.status, '') = 'settlement'
    );
  END IF;

  IF _new_status = 'settlement' THEN
    INSERT INTO public.user_coins(user_id, balance)
    VALUES (_tx.user_id, COALESCE(_tx.coins, 0))
    ON CONFLICT (user_id)
    DO UPDATE SET balance = public.user_coins.balance + EXCLUDED.balance,
                  updated_at = now();
    _credited := true;
  END IF;

  RETURN jsonb_build_object(
    'credited', _credited,
    'status', _new_status,
    'transaction_id', _tx.id,
    'user_id', _tx.user_id,
    'coins', _tx.coins
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.settle_transaction_atomic(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_transaction_atomic(text, text, text) TO service_role;
