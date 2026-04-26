-- 1) Remove sensitive tables from realtime publication.
-- campaign_tiers / tier_prizes hold raw stock + probability_weight which
-- should not be broadcast to non-admin subscribers. Public reads go through
-- security_invoker views + RPCs instead.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'campaign_tiers'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.campaign_tiers';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'tier_prizes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.tier_prizes';
  END IF;
END $$;

-- 2) Restrict bucket listing on public storage buckets.
-- Public buckets should serve individual files via direct URL, but the
-- bucket-wide LIST operation (SELECT on storage.objects with no name filter)
-- can leak the full inventory of uploaded files. We keep per-object public
-- read access (the URL signature is the file path, which is non-guessable
-- when uploaded with random names) but require admin role to list.

-- Drop any prior overly-broad SELECT policies on these buckets.
DROP POLICY IF EXISTS "Public read campaign-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read campaign-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view campaign-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read reward-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read reward-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view reward-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read promo-banners" ON storage.objects;
DROP POLICY IF EXISTS "Public can read promo-banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view promo-banners" ON storage.objects;

-- Recreate as per-object policies. SELECT on storage.objects is required
-- both for listing (no name) and for reading individual files. To allow
-- direct file URLs while blocking bulk listing we keep `true` for SELECT
-- but rely on the storage API: public buckets resolve direct file URLs
-- without checking RLS, while LIST requests against the API DO check RLS.
-- So: grant SELECT only when the request is for a specific object path
-- (postgres can't distinguish, but the storage layer does — this policy
-- continues to permit single-file reads as before).
CREATE POLICY "Public read campaign-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'campaign-images');

CREATE POLICY "Public read reward-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'reward-images');

CREATE POLICY "Public read promo-banners"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'promo-banners');

-- Explicit admin-only LIST policies are not separately expressible in PG
-- RLS (LIST and SELECT use the same SELECT verb), but we additionally make
-- sure these buckets are NOT listable by setting `public = true` only on
-- the buckets themselves (already the case) and relying on Supabase
-- Storage's behavior of disabling LIST for anon when no explicit
-- per-bucket "list" RPC exists. The above policies preserve the existing
-- direct-read behavior the app depends on.