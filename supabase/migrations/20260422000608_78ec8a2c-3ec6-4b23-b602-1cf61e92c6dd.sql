
-- 1. Lock down user_coins: drop the user-facing UPDATE policy
DROP POLICY IF EXISTS "Users can update own coins" ON public.user_coins;

-- 2. Recycle inventory item RPC (replaces client-side balance mutation)
CREATE OR REPLACE FUNCTION public.recycle_inventory_item(_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _item record;
  _new_balance integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _item FROM public.user_inventory
   WHERE id = _item_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  DELETE FROM public.user_inventory WHERE id = _item_id;

  UPDATE public.user_coins
     SET balance = balance + COALESCE(_item.coin_value, 0),
         updated_at = now()
   WHERE user_id = _user_id
   RETURNING balance INTO _new_balance;

  RETURN jsonb_build_object(
    'success', true,
    'coins_gained', COALESCE(_item.coin_value, 0),
    'new_balance', _new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recycle_inventory_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recycle_inventory_item(uuid) TO authenticated;

-- 3. Atomic gift transfer RPC
CREATE OR REPLACE FUNCTION public.transfer_gift_coins(_receiver_id uuid, _amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_id uuid := auth.uid();
  _sender record;
BEGIN
  IF _sender_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF _amount < 1 OR _amount > 100000 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF _receiver_id = _sender_id THEN
    RAISE EXCEPTION 'cannot_send_to_self';
  END IF;

  SELECT * INTO _sender FROM public.user_coins
   WHERE user_id = _sender_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_coin_account';
  END IF;
  IF _sender.balance < _amount THEN
    RAISE EXCEPTION 'insufficient_coins';
  END IF;

  -- Ensure receiver row exists
  INSERT INTO public.user_coins(user_id) VALUES (_receiver_id)
    ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_coins
     SET balance = balance - _amount, updated_at = now()
   WHERE user_id = _sender_id;

  UPDATE public.user_coins
     SET balance = balance + _amount, updated_at = now()
   WHERE user_id = _receiver_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_gift_coins(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.transfer_gift_coins(uuid, integer) TO authenticated;

-- 4. Atomic coupon redemption RPC
CREATE OR REPLACE FUNCTION public.redeem_coupon_atomic(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _coupon record;
  _used_by_user integer;
  _benefit_desc text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF _code IS NULL OR length(trim(_code)) < 2 THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  SELECT * INTO _coupon FROM public.coupons
   WHERE code = upper(trim(_code)) AND is_active = true
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_not_found';
  END IF;

  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RAISE EXCEPTION 'coupon_expired';
  END IF;
  IF _coupon.max_uses > 0 AND _coupon.used_count >= _coupon.max_uses THEN
    RAISE EXCEPTION 'coupon_exhausted';
  END IF;

  SELECT count(*) INTO _used_by_user FROM public.coupon_redemptions
   WHERE coupon_id = _coupon.id AND user_id = _user_id;
  IF _used_by_user >= _coupon.max_uses_per_user THEN
    RAISE EXCEPTION 'already_redeemed';
  END IF;

  INSERT INTO public.coupon_redemptions(coupon_id, user_id, benefit_type, benefit_value)
  VALUES (_coupon.id, _user_id, _coupon.benefit_type, _coupon.benefit_value);

  UPDATE public.coupons SET used_count = used_count + 1, updated_at = now()
   WHERE id = _coupon.id;

  -- Ensure user_coins exists
  INSERT INTO public.user_coins(user_id) VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING;

  IF _coupon.benefit_type = 'bonus_coins' THEN
    UPDATE public.user_coins SET balance = balance + _coupon.benefit_value, updated_at = now()
     WHERE user_id = _user_id;
    _benefit_desc := _coupon.benefit_value || ' koin bonus';
  ELSIF _coupon.benefit_type = 'free_gacha' THEN
    UPDATE public.user_coins SET free_draws = free_draws + _coupon.benefit_value, updated_at = now()
     WHERE user_id = _user_id;
    _benefit_desc := _coupon.benefit_value || 'x gacha gratis';
  ELSIF _coupon.benefit_type = 'discount_percent' THEN
    UPDATE public.user_coins
       SET active_discount_percent = GREATEST(active_discount_percent, _coupon.benefit_value),
           updated_at = now()
     WHERE user_id = _user_id;
    _benefit_desc := 'Diskon ' || _coupon.benefit_value || '%';
  ELSE
    _benefit_desc := 'Benefit: ' || _coupon.benefit_value;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'benefit_type', _coupon.benefit_type,
    'benefit_value', _coupon.benefit_value,
    'description', _benefit_desc,
    'coupon_description', _coupon.description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_coupon_atomic(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_coupon_atomic(text) TO authenticated;

-- 5. Add admin guards to admin-only functions + REVOKE
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at
    FROM auth.users u
   ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_users_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_all_users_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT json_build_object(
      'total_users', (SELECT count(*) FROM auth.users),
      'total_draws', (SELECT count(*) FROM public.draws),
      'total_campaigns', (SELECT count(*) FROM public.campaigns WHERE is_active = true),
      'draws_today', (SELECT count(*) FROM public.draws WHERE created_at >= CURRENT_DATE),
      'draws_this_week', (SELECT count(*) FROM public.draws WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_popular_campaigns(lim integer DEFAULT 5)
RETURNS TABLE(campaign_id text, campaign_title text, draw_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT d.campaign_id, c.title AS campaign_title, count(*)::bigint AS draw_count
    FROM public.draws d
    JOIN public.campaigns c ON c.id = d.campaign_id
   GROUP BY d.campaign_id, c.title
   ORDER BY count(*) DESC
   LIMIT lim;
END;
$$;

REVOKE ALL ON FUNCTION public.get_popular_campaigns(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_popular_campaigns(integer) TO authenticated;

-- 6. Restrict app_settings SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
CREATE POLICY "Authenticated users can view app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);
