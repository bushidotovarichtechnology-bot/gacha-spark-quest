-- Remove user-side INSERT policy on user_coins to prevent balance manipulation.
-- Row creation is handled by the handle_new_user trigger (SECURITY DEFINER) on signup,
-- and by SECURITY DEFINER RPCs (transfer_gift_coins, redeem_coupon_atomic, admin_set_user_banned)
-- via ON CONFLICT DO NOTHING upserts.
DROP POLICY IF EXISTS "Users can insert own coins" ON public.user_coins;