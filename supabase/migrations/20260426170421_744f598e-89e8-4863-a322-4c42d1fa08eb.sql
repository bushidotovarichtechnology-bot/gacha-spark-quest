-- 1) New restricted table for PIN hashes.
CREATE TABLE IF NOT EXISTS public.user_security_pins (
  user_id uuid PRIMARY KEY,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_security_pins ENABLE ROW LEVEL SECURITY;

-- No policies = no client access. Only SECURITY DEFINER functions can read/write.
-- Explicitly revoke all grants from client roles to make this airtight.
REVOKE ALL ON public.user_security_pins FROM anon, authenticated, public;

-- 2) Backfill from existing profiles.security_pin_hash (if any).
INSERT INTO public.user_security_pins (user_id, pin_hash)
SELECT user_id, security_pin_hash
  FROM public.profiles
 WHERE security_pin_hash IS NOT NULL AND security_pin_hash <> ''
ON CONFLICT (user_id) DO NOTHING;

-- 3) Update PIN functions to use the new table.
CREATE OR REPLACE FUNCTION public.set_security_pin(_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'invalid_pin_format';
  END IF;

  INSERT INTO public.user_security_pins(user_id, pin_hash)
  VALUES (_user_id, crypt(_pin, gen_salt('bf', 10)))
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_security_pin(_user_id uuid, _pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _hash text;
BEGIN
  IF _user_id IS NULL OR _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN
    RETURN false;
  END IF;
  SELECT pin_hash INTO _hash
    FROM public.user_security_pins
   WHERE user_id = _user_id;
  IF _hash IS NULL OR _hash = '' THEN
    RETURN false;
  END IF;
  RETURN _hash = crypt(_pin, _hash);
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_security_pin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_security_pins
     WHERE user_id = auth.uid()
       AND pin_hash <> ''
  );
$function$;

-- 4) Drop the column from profiles entirely so clients can never select it.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS security_pin_hash;

-- 5) Re-grant the safe non-sensitive columns on profiles (column list no longer
--    references security_pin_hash). This refreshes the column-level grants set
--    by a previous migration to match the new shape of the table.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, display_name, phone, recipient_name, address,
  city, province, postal_code, avatar_url, created_at, updated_at
) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;