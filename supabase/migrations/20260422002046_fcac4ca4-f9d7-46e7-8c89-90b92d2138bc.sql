-- 1. Restrict coupons SELECT to admins only (clients use redeem_coupon_atomic RPC)
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

CREATE POLICY "Admins can view coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Restrict Realtime subscriptions: only authenticated users may subscribe,
-- and they may only subscribe to topics that include their own auth.uid().
-- Admins may subscribe to any channel.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can subscribe to own topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to own topics"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR realtime.topic() LIKE '%' || auth.uid()::text || '%'
);