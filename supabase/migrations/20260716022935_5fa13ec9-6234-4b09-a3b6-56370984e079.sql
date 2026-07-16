
-- 1) app_settings: replace broad authenticated SELECT with admin-all + public-key allowlist

DROP POLICY IF EXISTS "Authenticated users can view app settings" ON public.app_settings;

CREATE POLICY "Admins can view all app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public keys are readable by anyone"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('maintenance_mode', 'payment_provider'));

GRANT SELECT ON public.app_settings TO anon;

-- 2) Revoke EXECUTE from anon on SECURITY DEFINER functions that should not be public.
--    Keep anon EXECUTE only on the intentionally-public helpers used on unauthenticated pages.

REVOKE EXECUTE ON FUNCTION public.admin_get_banned_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_digital_code_stats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_upload_digital_codes(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_banned(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_username(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_users_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_inventory_codes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pity_trend(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rate_up_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_tier_distribution(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_trade_item_details(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_ticket_balance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_security_pin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_username_available(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recycle_inventory_item(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon_atomic(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_reward(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.secure_draw(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_username(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.settle_transaction_atomic(text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transfer_gift_coins(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_security_pin(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._internal_execute_trade(uuid, uuid, text, jsonb, text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._rate_up_multiplier(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_pending_transactions() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_unpaid_claims() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_stale_trades() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_trade_token() FROM anon, authenticated;
