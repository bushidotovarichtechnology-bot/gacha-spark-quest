-- 1. Tambah kolom username (nullable awalnya, supaya user lama tidak ter-blok)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- 2. Constraint format username: 3-20 karakter, lowercase a-z, 0-9, underscore
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_chk
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

-- 3. Unique index case-insensitive (defensive: kolom sudah lowercase tapi tetap aman)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- 4. Trigger: username permanen — sekali di-set tidak bisa diubah / dihapus
CREATE OR REPLACE FUNCTION public.enforce_username_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.username IS NOT NULL AND OLD.username <> '' THEN
    IF NEW.username IS DISTINCT FROM OLD.username THEN
      RAISE EXCEPTION 'username_immutable'
        USING HINT = 'Username sudah diset dan tidak dapat diubah.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_username_immutable ON public.profiles;
CREATE TRIGGER profiles_username_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_username_immutable();

-- 5. RPC: cari user_id berdasarkan username (untuk gift / trade recipient picker)
CREATE OR REPLACE FUNCTION public.find_user_id_by_username(_username text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles
   WHERE lower(username) = lower(trim(_username))
   LIMIT 1;
$$;

-- 6. RPC: cek ketersediaan username (untuk validasi UI realtime)
CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE lower(username) = lower(trim(_username))
  );
$$;

-- 7. RPC: set username sekali seumur hidup (atomic + validasi server-side)
CREATE OR REPLACE FUNCTION public.set_username(_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _normalized text;
  _existing text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF _username IS NULL THEN
    RAISE EXCEPTION 'invalid_username_format';
  END IF;

  _normalized := lower(trim(_username));

  IF _normalized !~ '^[a-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'invalid_username_format';
  END IF;

  -- Pastikan profil ada
  INSERT INTO public.profiles(user_id) VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT username INTO _existing FROM public.profiles
   WHERE user_id = _user_id FOR UPDATE;

  IF _existing IS NOT NULL AND _existing <> '' THEN
    RAISE EXCEPTION 'username_already_set';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = _normalized) THEN
    RAISE EXCEPTION 'username_taken';
  END IF;

  UPDATE public.profiles
     SET username = _normalized,
         updated_at = now()
   WHERE user_id = _user_id;

  RETURN jsonb_build_object('success', true, 'username', _normalized);
END;
$$;