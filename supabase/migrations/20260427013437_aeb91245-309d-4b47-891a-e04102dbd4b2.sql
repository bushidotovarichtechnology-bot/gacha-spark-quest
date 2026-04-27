-- Ensure pgcrypto is available (provides gen_salt + crypt for bcrypt hashing).
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate set_security_pin to call extensions.gen_salt / extensions.crypt explicitly,
-- so it does not depend on search_path including the extensions schema.
CREATE OR REPLACE FUNCTION public.set_security_pin(_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _hash text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF _pin IS NULL OR _pin !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'invalid_pin_format';
  END IF;

  _hash := extensions.crypt(_pin, extensions.gen_salt('bf', 10));

  INSERT INTO public.user_security_pins (user_id, pin_hash, created_at, updated_at)
  VALUES (_user_id, _hash, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Recreate verify_security_pin similarly to use extensions.crypt explicitly.
CREATE OR REPLACE FUNCTION public.verify_security_pin(_user_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stored_hash text;
BEGIN
  IF _user_id IS NULL OR _pin IS NULL THEN
    RETURN false;
  END IF;

  SELECT pin_hash INTO _stored_hash
  FROM public.user_security_pins
  WHERE user_id = _user_id;

  IF _stored_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN extensions.crypt(_pin, _stored_hash) = _stored_hash;
END;
$$;
