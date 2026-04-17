-- 1. Add rate limit + IP tracking columns to user_coins
ALTER TABLE public.user_coins
  ADD COLUMN IF NOT EXISTS last_draw_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_draw_ip text;

-- 2. Create gacha_logs table for security audit (IP, UA, every draw attempt)
CREATE TABLE IF NOT EXISTS public.gacha_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id text NOT NULL,
  draw_count integer NOT NULL DEFAULT 1,
  ip_address text,
  user_agent text,
  result_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gacha_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs; only service_role (edge function) writes
CREATE POLICY "Admins can view all gacha logs"
ON public.gacha_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own gacha logs"
ON public.gacha_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gacha_logs_user_created ON public.gacha_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gacha_logs_ip_created ON public.gacha_logs(ip_address, created_at DESC);

-- 3. Atomic secure draw RPC: validates coins/free draws, applies pity from DB,
-- selects prizes server-side, decrements remaining, deducts coins, inserts draws,
-- inserts inventory, inserts redeem_tickets — all in ONE transaction.
CREATE OR REPLACE FUNCTION public.secure_draw(
  _campaign_id text,
  _draw_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  _selected_tier record;
  _selected_prize record;
  _is_pity_draw boolean;
  _r numeric;
  _cumulative numeric;
  _total_weight numeric;
  _coin_value integer;
  _draw_id uuid;
  _ticket_qty integer;
  _last_draw timestamptz;
  _coin_values jsonb := '{"S":1000,"A":200,"B":80,"C":15}'::jsonb;
  _ticket_values jsonb := '{"S":5,"A":3,"B":2,"C":1}'::jsonb;
  _tier_order text[] := ARRAY['S','A','B','C'];
  _guaranteed_idx integer;
  _total_remaining integer;
  _tier_s_remaining integer;
  _exclude_s boolean;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF _draw_count < 1 OR _draw_count > 10 THEN
    RAISE EXCEPTION 'invalid_draw_count';
  END IF;

  -- Lock user_coins row for atomic update + rate limit
  SELECT * INTO _coins FROM public.user_coins
   WHERE user_id = _user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_coin_account';
  END IF;

  -- Server-side rate limit: 2 seconds between draws
  IF _coins.last_draw_at IS NOT NULL AND _coins.last_draw_at > now() - interval '2 seconds' THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  -- Load campaign
  SELECT * INTO _campaign FROM public.campaigns
   WHERE id = _campaign_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_found';
  END IF;

  -- Pity settings
  SELECT * INTO _pity FROM public.pity_settings WHERE campaign_id = _campaign_id;
  _pity_enabled := COALESCE(_pity.is_enabled, true);
  _pity_threshold := COALESCE(_pity.threshold, 10);
  _pity_tier := COALESCE(_pity.guaranteed_tier, 'A');
  _pity_count := _coins.draws_since_tier_a;
  _guaranteed_idx := array_position(_tier_order, _pity_tier);

  -- Cost calc with free draws + discount
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

  -- Lock all tier_prizes for this campaign
  PERFORM 1 FROM public.tier_prizes tp
    JOIN public.campaign_tiers ct ON ct.id = tp.tier_id
   WHERE ct.campaign_id = _campaign_id FOR UPDATE;

  -- Loop draws
  FOR _i IN 1.._draw_count LOOP
    -- Compute remaining totals (with grand prize lock: exclude S unless only S left)
    SELECT
      COALESCE(SUM(tp.remaining), 0),
      COALESCE(SUM(tp.remaining) FILTER (WHERE ct.label = 'S'), 0)
    INTO _total_remaining, _tier_s_remaining
    FROM public.tier_prizes tp
    JOIN public.campaign_tiers ct ON ct.id = tp.tier_id
    WHERE ct.campaign_id = _campaign_id;

    EXIT WHEN _total_remaining <= 0;

    _exclude_s := (_tier_s_remaining > 0 AND _total_remaining > _tier_s_remaining);
    _is_pity_draw := _pity_enabled AND _pity_count >= _pity_threshold - 1;

    -- Select tier (weighted random)
    IF _is_pity_draw THEN
      _has_pity := true;
      WITH active_tiers AS (
        SELECT ct.id, ct.label, ct.probability_weight,
               COALESCE(SUM(tp.remaining), 0) AS rem
          FROM public.campaign_tiers ct
          LEFT JOIN public.tier_prizes tp ON tp.tier_id = ct.id
         WHERE ct.campaign_id = _campaign_id
           AND (NOT _exclude_s OR ct.label <> 'S')
           AND array_position(_tier_order, ct.label) <= _guaranteed_idx
         GROUP BY ct.id, ct.label, ct.probability_weight
        HAVING COALESCE(SUM(tp.remaining), 0) > 0
      )
      SELECT id, label, probability_weight INTO _selected_tier
        FROM active_tiers
       ORDER BY random() * probability_weight DESC
       LIMIT 1;
    ELSE
      _selected_tier := NULL;
    END IF;

    IF _selected_tier.id IS NULL THEN
      WITH active_tiers AS (
        SELECT ct.id, ct.label, ct.probability_weight,
               COALESCE(SUM(tp.remaining), 0) AS rem
          FROM public.campaign_tiers ct
          LEFT JOIN public.tier_prizes tp ON tp.tier_id = ct.id
         WHERE ct.campaign_id = _campaign_id
           AND (NOT _exclude_s OR ct.label <> 'S')
         GROUP BY ct.id, ct.label, ct.probability_weight
        HAVING COALESCE(SUM(tp.remaining), 0) > 0
      ),
      cum AS (
        SELECT id, label, probability_weight,
               SUM(probability_weight) OVER (ORDER BY id) AS cw,
               SUM(probability_weight) OVER () AS tw
          FROM active_tiers
      )
      SELECT id, label, probability_weight INTO _selected_tier
        FROM cum
       WHERE cw >= random() * tw
       ORDER BY cw
       LIMIT 1;
    END IF;

    EXIT WHEN _selected_tier.id IS NULL;

    -- Select prize within tier (weighted random, only remaining > 0)
    WITH ap AS (
      SELECT id, name, image_url, coin_value, probability_weight, remaining, total, auto_refill
        FROM public.tier_prizes
       WHERE tier_id = _selected_tier.id AND remaining > 0
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

    -- Decrement remaining (auto-refill if zero)
    IF _selected_prize.remaining - 1 <= 0 AND _selected_prize.auto_refill THEN
      UPDATE public.tier_prizes SET remaining = total WHERE id = _selected_prize.id;
    ELSE
      UPDATE public.tier_prizes SET remaining = remaining - 1 WHERE id = _selected_prize.id;
    END IF;

    _coin_value := CASE WHEN _selected_prize.coin_value > 0
                        THEN _selected_prize.coin_value
                        ELSE COALESCE((_coin_values ->> _selected_tier.label)::int, 15) END;

    -- Update pity counter
    IF _selected_tier.label = 'S' OR _selected_tier.label = 'A' THEN
      _pity_count := 0;
    ELSE
      _pity_count := _pity_count + 1;
    END IF;

    -- Insert draw
    INSERT INTO public.draws(user_id, campaign_id, tier_label, prize_name, coin_value, is_pity)
    VALUES (_user_id, _campaign_id, _selected_tier.label, _selected_prize.name, _coin_value, _is_pity_draw)
    RETURNING id INTO _draw_id;

    -- Insert inventory
    INSERT INTO public.user_inventory(user_id, prize_name, tier_label, campaign_id, campaign_name, image_url, coin_value)
    VALUES (_user_id, _selected_prize.name, _selected_tier.label, _campaign_id, _campaign.title,
            COALESCE(NULLIF(_selected_prize.image_url, ''), _campaign.image_url), _coin_value);

    -- Insert ticket
    _ticket_qty := COALESCE((_ticket_values ->> _selected_tier.label)::int, 1);
    INSERT INTO public.redeem_tickets(user_id, campaign_id, draw_id, ticket_type, quantity, remaining)
    VALUES (_user_id, _campaign_id, _draw_id, 'standard', _ticket_qty, _ticket_qty);

    _results := _results || jsonb_build_object(
      'tier', _selected_tier.label,
      'prize', _selected_prize.name,
      'image', COALESCE(NULLIF(_selected_prize.image_url, ''), _campaign.image_url),
      'coinValue', _coin_value,
      'isPityReward', _is_pity_draw,
      'ticketsAwarded', _ticket_qty
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
$$;

-- Allow authenticated users to invoke
REVOKE ALL ON FUNCTION public.secure_draw(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.secure_draw(text, integer) TO authenticated;