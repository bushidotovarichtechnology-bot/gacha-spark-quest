
-- Update get_rate_up_status: tambah cutoff 31 Mei 2026 23:59:59 WIB (UTC+7)
CREATE OR REPLACE FUNCTION public.get_rate_up_status(_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _index integer;
  _multiplier numeric := 1.0;
  _is_rate_up boolean := false;
  _limit integer := 100;
  _ends_at timestamptz := '2026-05-31 23:59:59+07'::timestamptz;
  _expired boolean := now() > _ends_at;
BEGIN
  IF _user_id IS NULL OR _expired THEN
    RETURN jsonb_build_object(
      'is_rate_up', false,
      'user_index', null,
      'multiplier', 1.0,
      'limit', _limit,
      'ends_at', _ends_at,
      'expired', _expired
    );
  END IF;

  SELECT rn INTO _index FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
      FROM auth.users
  ) ranked
  WHERE id = _user_id;

  IF _index IS NOT NULL AND _index <= _limit THEN
    _is_rate_up := true;
    _multiplier := 1.5;
  END IF;

  RETURN jsonb_build_object(
    'is_rate_up', _is_rate_up,
    'user_index', _index,
    'multiplier', _multiplier,
    'limit', _limit,
    'ends_at', _ends_at,
    'expired', false
  );
END;
$$;

-- Helper internal yang dipakai secure_draw juga ikut respect cutoff
CREATE OR REPLACE FUNCTION public._rate_up_multiplier(_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _index integer;
  _ends_at timestamptz := '2026-05-31 23:59:59+07'::timestamptz;
BEGIN
  IF _user_id IS NULL OR now() > _ends_at THEN RETURN 1.0; END IF;
  SELECT rn INTO _index FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
      FROM auth.users
  ) ranked WHERE id = _user_id;
  IF _index IS NOT NULL AND _index <= 100 THEN
    RETURN 1.5;
  END IF;
  RETURN 1.0;
END;
$$;
