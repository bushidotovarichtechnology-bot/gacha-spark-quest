
-- Create public bucket for campaign images
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-images', 'campaign-images', true);

-- Anyone can view campaign images
CREATE POLICY "Campaign images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-images');

-- Only admins can upload
CREATE POLICY "Admins can upload campaign images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Only admins can update
CREATE POLICY "Admins can update campaign images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Only admins can delete
CREATE POLICY "Admins can delete campaign images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
