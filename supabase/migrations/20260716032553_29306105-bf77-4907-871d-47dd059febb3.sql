DROP POLICY IF EXISTS "Admins can upload promo banner images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update promo banner images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete promo banner images" ON storage.objects;

CREATE POLICY "Admins can upload promo banner images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update promo banner images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete promo banner images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'::app_role));