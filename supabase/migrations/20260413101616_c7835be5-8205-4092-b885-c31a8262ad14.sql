
ALTER TABLE public.contact_messages
ADD COLUMN reply text DEFAULT NULL,
ADD COLUMN replied_at timestamp with time zone DEFAULT NULL;

-- Allow admins to update contact messages (for replying)
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
