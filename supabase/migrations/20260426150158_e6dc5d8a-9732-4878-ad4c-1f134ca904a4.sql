
-- Enable pgcrypto for hashing PIN (uses crypt + gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add security_pin_hash to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS security_pin_hash text NOT NULL DEFAULT '';

-- 2. Trades table (active requests)
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  initiator_id uuid NOT NULL,
  responder_id uuid,
  initiator_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  responder_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tier_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trades_tier_chk CHECK (tier_label IN ('S','A','B')),
  CONSTRAINT trades_status_chk CHECK (status IN ('pending','accepted','rejected','cancelled','expired')),
  CONSTRAINT trades_no_self_trade CHECK (responder_id IS NULL OR responder_id <> initiator_id)
);

CREATE INDEX IF NOT EXISTS idx_trades_initiator ON public.trades(initiator_id);
CREATE INDEX IF NOT EXISTS idx_trades_responder ON public.trades(responder_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_token ON public.trades(token);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Inisiator membuat trade untuk dirinya sendiri
CREATE POLICY "Users can create own trades"
  ON public.trades FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = initiator_id);

-- Lihat: pihak terkait atau admin
CREATE POLICY "Parties can view their trades"
  ON public.trades FOR SELECT TO authenticated
  USING (
    auth.uid() = initiator_id
    OR auth.uid() = responder_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Update terbatas: inisiator boleh cancel trade pending miliknya;
-- responder boleh "claim" link dengan mengisi responder_id (dilakukan via edge function umumnya).
-- Eksekusi merge & status final dilakukan oleh edge function (service role bypass RLS).
CREATE POLICY "Initiator can cancel own pending trade"
  ON public.trades FOR UPDATE TO authenticated
  USING (auth.uid() = initiator_id AND status = 'pending')
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Admin can manage trades"
  ON public.trades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Trade history (immutable audit log)
CREATE TABLE IF NOT EXISTS public.trade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid,
  initiator_id uuid NOT NULL,
  responder_id uuid,
  tier_label text,
  items_exchanged jsonb NOT NULL DEFAULT '{}'::jsonb,
  gas_fee integer NOT NULL DEFAULT 0,
  outcome text NOT NULL,
  error_reason text,
  initiator_ip text,
  responder_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trade_history_outcome_chk CHECK (outcome IN ('success','failed','cancelled','expired'))
);

CREATE INDEX IF NOT EXISTS idx_trade_history_initiator ON public.trade_history(initiator_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_responder ON public.trade_history(responder_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_trade_id ON public.trade_history(trade_id);

ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view own history"
  ON public.trade_history FOR SELECT TO authenticated
  USING (
    auth.uid() = initiator_id
    OR auth.uid() = responder_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Tidak ada policy INSERT/UPDATE/DELETE: hanya edge function (service role) yang menulis.

-- 4. updated_at trigger for trades
DROP TRIGGER IF EXISTS trg_trades_updated_at ON public.trades;
CREATE TRIGGER trg_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper: set security PIN (hashed)
CREATE OR REPLACE FUNCTION public.set_security_pin(_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'invalid_pin_format';
  END IF;

  -- Ensure profile row exists
  INSERT INTO public.profiles(user_id) VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.profiles
     SET security_pin_hash = crypt(_pin, gen_salt('bf', 10)),
         updated_at = now()
   WHERE user_id = _user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Helper: verify security PIN (called by edge function via service role)
CREATE OR REPLACE FUNCTION public.verify_security_pin(_user_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
BEGIN
  IF _user_id IS NULL OR _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN
    RETURN false;
  END IF;
  SELECT security_pin_hash INTO _hash FROM public.profiles WHERE user_id = _user_id;
  IF _hash IS NULL OR _hash = '' THEN
    RETURN false;
  END IF;
  RETURN _hash = crypt(_pin, _hash);
END;
$$;

-- 7. Helper: check if current user has set a PIN (frontend gating)
CREATE OR REPLACE FUNCTION public.has_security_pin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT security_pin_hash <> '' FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- 8. Helper: generate unique short trade token (URL-safe)
CREATE OR REPLACE FUNCTION public.generate_trade_token()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  _candidate text;
  _exists boolean;
BEGIN
  LOOP
    -- 12 chars from base64url-ish
    _candidate := lower(translate(encode(gen_random_bytes(9), 'base64'), '+/=', 'xyz'));
    SELECT EXISTS(SELECT 1 FROM public.trades WHERE token = _candidate) INTO _exists;
    EXIT WHEN NOT _exists;
  END LOOP;
  RETURN _candidate;
END;
$$;

-- 9. Helper: expire stale pending trades (callable from cron later)
CREATE OR REPLACE FUNCTION public.expire_stale_trades()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  UPDATE public.trades
     SET status = 'expired', updated_at = now()
   WHERE status = 'pending' AND expires_at < now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- 10. Realtime: enable for trades so responder/initiator UI updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
