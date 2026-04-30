-- 1. Tambah kolom coupon_code (nullable dulu untuk backfill)
ALTER TABLE public.coupon_redemptions
  ADD COLUMN IF NOT EXISTS coupon_code text;

-- 2. Backfill dari coupons (yang masih ada)
UPDATE public.coupon_redemptions cr
SET coupon_code = upper(trim(c.code))
FROM public.coupons c
WHERE cr.coupon_id = c.id
  AND cr.coupon_code IS NULL;

-- 3. Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_code
  ON public.coupon_redemptions (user_id, coupon_code);

-- 4. Update fungsi redeem_coupon_atomic agar memblokir kode yang pernah di-redeem
CREATE OR REPLACE FUNCTION public.redeem_coupon_atomic(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _coupon record;
  _used_by_user integer;
  _used_by_user_historical integer;
  _normalized_code text;
  _benefit_desc text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF _code IS NULL OR length(trim(_code)) < 2 THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  _normalized_code := upper(trim(_code));

  -- Blokir jika user pernah redeem kode ini sebelumnya (meski coupon sudah dihapus & dibuat ulang)
  SELECT count(*) INTO _used_by_user_historical
    FROM public.coupon_redemptions
   WHERE user_id = _user_id
     AND coupon_code = _normalized_code;
  IF _used_by_user_historical > 0 THEN
    RAISE EXCEPTION 'already_redeemed';
  END IF;

  SELECT * INTO _coupon FROM public.coupons
   WHERE code = _normalized_code AND is_active = true
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

  INSERT INTO public.coupon_redemptions(coupon_id, user_id, benefit_type, benefit_value, coupon_code)
  VALUES (_coupon.id, _user_id, _coupon.benefit_type, _coupon.benefit_value, _normalized_code);

  UPDATE public.coupons SET used_count = used_count + 1, updated_at = now()
   WHERE id = _coupon.id;

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
$function$;