-- Drop overly broad SELECT policies on storage.objects for these buckets if exist
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (policyname ILIKE '%campaign-images%' OR policyname ILIKE '%reward-images%'
           OR policyname ILIKE '%campaign images%' OR policyname ILIKE '%reward images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Admin-only listing/management; public file access still works via direct URL because buckets are public
CREATE POLICY "Admins can list campaign-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'campaign-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload campaign-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'campaign-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update campaign-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'campaign-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete campaign-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'campaign-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can list reward-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'reward-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload reward-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reward-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reward-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'reward-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reward-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'reward-images' AND public.has_role(auth.uid(), 'admin'::app_role));