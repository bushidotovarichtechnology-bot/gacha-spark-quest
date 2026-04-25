-- 1. Add is_digital flag to tier_prizes
ALTER TABLE public.tier_prizes ADD COLUMN IF NOT EXISTS is_digital boolean NOT NULL DEFAULT false;

-- 2. Add digital_code to user_inventory (assigned at draw time)
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS digital_code text;

-- 3. Create digital_codes pool table
CREATE TABLE IF NOT EXISTS public.digital_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id uuid NOT NULL REFERENCES public.tier_prizes(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'available', -- available | assigned
  assigned_to_inventory_id uuid,
  assigned_to_user_id uuid,
  assigned_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS digital_codes_prize_code_unique ON public.digital_codes(prize_id, code);
CREATE INDEX IF NOT EXISTS digital_codes_prize_status_idx ON public.digital_codes(prize_id, status);

ALTER TABLE public.digital_codes ENABLE ROW LEVEL SECURITY;

-- RLS: only admins can manage the pool
DROP POLICY IF EXISTS "Admins can manage digital codes" ON public.digital_codes;
CREATE POLICY "Admins can manage digital codes" ON public.digital_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can view ONLY codes assigned to themselves (for redundancy; primary access via user_inventory.digital_code)
DROP POLICY IF EXISTS "Users can view own assigned codes" ON public.digital_codes;
CREATE POLICY "Users can view own assigned codes" ON public.digital_codes
  FOR SELECT TO authenticated
  USING (assigned_to_user_id = auth.uid());

-- 4. Admin RPC: bulk upload codes for a prize
CREATE OR REPLACE FUNCTION public.admin_upload_digital_codes(_prize_id uuid, _codes text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted integer := 0;
  _skipped integer := 0;
  _code text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  FOREACH _code IN ARRAY _codes LOOP
    _code := trim(_code);
    CONTINUE WHEN _code = '' OR _code IS NULL;
    BEGIN
      INSERT INTO public.digital_codes(prize_id, code) VALUES (_prize_id, _code);
      _inserted := _inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      _skipped := _skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('inserted', _inserted, 'skipped_duplicates', _skipped);
END;
$$;

-- 5. Admin RPC: get code stats per prize
CREATE OR REPLACE FUNCTION public.admin_get_digital_code_stats(_prize_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _available integer;
  _assigned integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT
    COUNT(*) FILTER (WHERE status = 'available'),
    COUNT(*) FILTER (WHERE status = 'assigned')
  INTO _available, _assigned
  FROM public.digital_codes WHERE prize_id = _prize_id;
  RETURN jsonb_build_object('available', COALESCE(_available, 0), 'assigned', COALESCE(_assigned, 0));
END;
$$;

-- 6. Update secure_draw to assign a digital code atomically when prize is digital.
-- If prize.is_digital and no available code → skip this prize (try again, exclude this prize? simplest: treat as out-of-stock for this draw iteration).
CREATE OR REPLACE FUNCTION public.secure_draw(_campaign_id text, _draw_count integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _campaign record;
  _coins record;
  _pity record;
  _pity_threshold integer;
  _pity_tier text;
  _pity_enabled boolean;
  _pity_count integer;
  _free_used integer;
  _paid_count integer;
  _price_per integer;
  _total_cost integer;
  _new_balance integer;
  _new_free integer;
  _new_discount integer;
  _i integer;
  _results jsonb := '[]'::jsonb;
  _has_pity boolean := false;
  _sel_tier_id uuid;
  _sel_tier_label text;
  _selected_prize record;
  _is_pity_draw boolean;
  _coin_value integer;
  _draw_id uuid;
  _ticket_qty integer;
  _coin_values jsonb := '{"S":1000,"A":200,"B":80,"C":15}'::jsonb;
  _ticket_values jsonb := '{"S":5,"A":3,"B":2,"C":1}'::jsonb;
  _total_remaining integer;
  _tier_s_remaining integer;
  _exclude_s boolean;
  _c_consumed integer := 0;
  _boost_c numeric := 0.01;
  _boost_ba numeric := 0.001;
  _bonus_c numeric;
  _bonus_ba numeric;
  _inv_id uuid;
  _assigned_code text;
  _code_row_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF _draw_count < 1 OR _draw_count > 10 THEN
    RAISE EXCEPTION 'invalid_draw_count';
  END IF;

  SELECT * INTO _coins FROM public.user_coins
   WHERE user_id = _user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_coin_account';
  END IF;

  IF _coins.is_banned THEN
    RAISE EXCEPTION 'user_banned';
  END IF;

  IF _coins.last_draw_at IS NOT NULL AND _coins.last_draw_at > now() - interval '2 seconds' THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  SELECT * INTO _campaign FROM public.campaigns
   WHERE id = _campaign_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_found';
  END IF;

  SELECT * INTO _pity FROM public.pity_settings WHERE campaign_id = _campaign_id;
  _pity_enabled := COALESCE(_pity.is_enabled, true);
  _pity_threshold := COALESCE(_pity.threshold, 10);
  _pity_tier := COALESCE(_pity.guaranteed_tier, 'A');
  _pity_count := _coins.draws_since_tier_a;

  _free_used := LEAST(_coins.free_draws, _draw_count);
  _paid_count := _draw_count - _free_used;
  _price_per := CASE
    WHEN _coins.active_discount_percent > 0
    THEN ROUND(_campaign.price * (1 - _coins.active_discount_percent::numeric / 100))::integer
    ELSE _campaign.price
  END;
  _total_cost := _paid_count * _price_per;

  IF _coins.balance < _total_cost THEN
    RAISE EXCEPTION 'insufficient_coins';
  END IF;

  PERFORM 1 FROM public.tier_prizes tp
    JOIN public.campaign_tiers ct ON ct.id = tp.tier_id
   WHERE ct.campaign_id = _campaign_id FOR UPDATE;

  FOR _i IN 1.._draw_count LOOP
    SELECT
      COALESCE(SUM(tp.remaining), 0),
      COALESCE(SUM(tp.remaining) FILTER (WHERE ct.label = 'S'), 0)
    INTO _total_remaining, _tier_s_remaining
    FROM public.tier_prizes tp
    JOIN public.campaign_tiers ct ON ct.id = tp.tier_id
    WHERE ct.campaign_id = _campaign_id;

    EXIT WHEN _total_remaining <= 0;

    SELECT COALESCE(SUM(GREATEST(tp.total - tp.remaining, 0)), 0)
      INTO _c_consumed
      FROM public.tier_prizes tp
      JOIN public.campaign_tiers ct ON ct.id = tp.tier_id
     WHERE ct.campaign_id = _campaign_id
       AND ct.label = 'C';

    _bonus_c  := _c_consumed * _boost_c;
    _bonus_ba := _c_consumed * _boost_ba;

    _exclude_s := (_tier_s_remaining > 0 AND _total_remaining > _tier_s_remaining);
    _is_pity_draw := _pity_enabled AND _pity_count >= _pity_threshold - 1;

    _sel_tier_id := NULL;
    _sel_tier_label := NULL;

    IF _is_pity_draw THEN
      WITH active_tiers AS (
        SELECT ct.id, ct.label, ct.probability_weight
          FROM public.campaign_tiers ct
          LEFT JOIN public.tier_prizes tp ON tp.tier_id = ct.id
         WHERE ct.campaign_id = _campaign_id
           AND ct.label = _pity_tier
         GROUP BY ct.id, ct.label, ct.probability_weight
        HAVING COALESCE(SUM(tp.remaining), 0) > 0
      )
      SELECT id, label INTO _sel_tier_id, _sel_tier_label
        FROM active_tiers
       ORDER BY random() * probability_weight DESC
       LIMIT 1;

      IF _sel_tier_id IS NOT NULL THEN
        _has_pity := true;
      END IF;
    END IF;

    IF _sel_tier_id IS NULL THEN
      _is_pity_draw := false;
      WITH active_tiers AS (
        SELECT ct.id, ct.label,
               (ct.probability_weight
                 + CASE ct.label
                     WHEN 'C' THEN _bonus_c
                     WHEN 'B' THEN _bonus_ba
                     WHEN 'A' THEN _bonus_ba
                     ELSE 0::numeric
                   END
               ) AS effective_weight
          FROM public.campaign_tiers ct
          LEFT JOIN public.tier_prizes tp ON tp.tier_id = ct.id
         WHERE ct.campaign_id = _campaign_id
           AND (NOT _exclude_s OR ct.label <> 'S')
         GROUP BY ct.id, ct.label, ct.probability_weight
        HAVING COALESCE(SUM(tp.remaining), 0) > 0
      ),
      cum AS (
        SELECT id, label,
               SUM(effective_weight) OVER (ORDER BY id) AS cw,
               SUM(effective_weight) OVER () AS tw
          FROM active_tiers
      )
      SELECT id, label INTO _sel_tier_id, _sel_tier_label
        FROM cum
       WHERE cw >= random() * tw
       ORDER BY cw
       LIMIT 1;
    END IF;

    EXIT WHEN _sel_tier_id IS NULL;

    -- Pick a prize. For digital prizes, require an available code; otherwise exclude that prize.
    _selected_prize := NULL;
    WITH ap AS (
      SELECT tp.id, tp.name, tp.image_url, tp.coin_value, tp.probability_weight, tp.remaining, tp.total, tp.auto_refill, tp.is_digital
        FROM public.tier_prizes tp
       WHERE tp.tier_id = _sel_tier_id
         AND tp.remaining > 0
         AND (
           tp.is_digital = false
           OR EXISTS (SELECT 1 FROM public.digital_codes dc WHERE dc.prize_id = tp.id AND dc.status = 'available')
         )
    ),
    cum AS (
      SELECT *, SUM(probability_weight) OVER (ORDER BY id) AS cw,
                SUM(probability_weight) OVER () AS tw
        FROM ap
    )
    SELECT * INTO _selected_prize
      FROM cum
     WHERE cw >= random() * tw
     ORDER BY cw
     LIMIT 1;

    EXIT WHEN _selected_prize.id IS NULL;

    -- For digital prize: lock and assign one available code atomically
    _assigned_code := NULL;
    _code_row_id := NULL;
    IF _selected_prize.is_digital THEN
      SELECT id, code INTO _code_row_id, _assigned_code
        FROM public.digital_codes
       WHERE prize_id = _selected_prize.id AND status = 'available'
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1;

      IF _code_row_id IS NULL THEN
        -- Race lost; treat as unavailable, try next iteration
        CONTINUE;
      END IF;
    END IF;

    IF _selected_prize.remaining - 1 <= 0 AND _selected_prize.auto_refill THEN
      UPDATE public.tier_prizes SET remaining = total WHERE id = _selected_prize.id;
    ELSE
      UPDATE public.tier_prizes SET remaining = remaining - 1 WHERE id = _selected_prize.id;
    END IF;

    _coin_value := CASE WHEN _selected_prize.coin_value > 0
                        THEN _selected_prize.coin_value
                        ELSE COALESCE((_coin_values ->> _sel_tier_label)::int, 15) END;

    IF _sel_tier_label = 'S' OR _sel_tier_label = 'A' THEN
      _pity_count := 0;
    ELSE
      _pity_count := _pity_count + 1;
    END IF;

    INSERT INTO public.draws(user_id, campaign_id, tier_label, prize_name, coin_value, is_pity)
    VALUES (_user_id, _campaign_id, _sel_tier_label, _selected_prize.name, _coin_value, _is_pity_draw)
    RETURNING id INTO _draw_id;

    INSERT INTO public.user_inventory(user_id, prize_name, tier_label, campaign_id, campaign_name, image_url, coin_value, digital_code)
    VALUES (_user_id, _selected_prize.name, _sel_tier_label, _campaign_id, _campaign.title,
            COALESCE(NULLIF(_selected_prize.image_url, ''), _campaign.image_url), _coin_value, _assigned_code)
    RETURNING id INTO _inv_id;

    -- Mark code as assigned
    IF _code_row_id IS NOT NULL THEN
      UPDATE public.digital_codes
         SET status = 'assigned',
             assigned_to_inventory_id = _inv_id,
             assigned_to_user_id = _user_id,
             assigned_at = now()
       WHERE id = _code_row_id;
    END IF;

    _ticket_qty := COALESCE((_ticket_values ->> _sel_tier_label)::int, 1);
    INSERT INTO public.redeem_tickets(user_id, campaign_id, draw_id, ticket_type, quantity, remaining)
    VALUES (_user_id, _campaign_id, _draw_id, 'standard', _ticket_qty, _ticket_qty);

    _results := _results || jsonb_build_object(
      'tier', _sel_tier_label,
      'prize', _selected_prize.name,
      'image', COALESCE(NULLIF(_selected_prize.image_url, ''), _campaign.image_url),
      'coinValue', _coin_value,
      'isPityReward', _is_pity_draw,
      'ticketsAwarded', _ticket_qty,
      'isDigital', _selected_prize.is_digital,
      'digitalCode', _assigned_code
    );
  END LOOP;

  _new_balance := _coins.balance - _total_cost;
  _new_free := _coins.free_draws - _free_used;
  _new_discount := CASE WHEN _coins.active_discount_percent > 0 AND _paid_count > 0 THEN 0 ELSE _coins.active_discount_percent END;

  UPDATE public.user_coins
     SET balance = _new_balance,
         draws_since_tier_a = _pity_count,
         free_draws = _new_free,
         active_discount_percent = _new_discount,
         last_draw_at = now()
   WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'results', _results,
    'has_pity_reward', _has_pity,
    'new_balance', _new_balance,
    'new_free_draws', _new_free,
    'new_pity_count', _pity_count,
    'cost_paid', _total_cost,
    'free_used', _free_used
  );
END;
$function$;