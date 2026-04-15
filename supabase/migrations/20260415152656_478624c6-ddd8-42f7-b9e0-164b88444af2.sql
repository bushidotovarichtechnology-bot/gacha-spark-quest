
CREATE TABLE public.coin_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  receiver_email TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gifts they sent or received"
ON public.coin_gifts FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert gifts as sender"
ON public.coin_gifts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can view all gifts"
ON public.coin_gifts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
