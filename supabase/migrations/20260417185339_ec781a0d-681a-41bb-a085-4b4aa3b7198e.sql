
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the expiry function
CREATE OR REPLACE FUNCTION public.expire_unpaid_claims()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _claim record;
  _count integer := 0;
BEGIN
  FOR _claim IN
    SELECT id, user_id, prize_name, tier_label, campaign_id, image_url, coin_value
    FROM public.prize_claims
    WHERE payment_status = 'unpaid'
      AND shipping_cost > 0
      AND created_at < now() - interval '24 hours'
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Mark as failed
    UPDATE public.prize_claims
       SET payment_status = 'failed',
           status = 'cancelled',
           updated_at = now()
     WHERE id = _claim.id;

    -- Return item to inventory
    INSERT INTO public.user_inventory(user_id, prize_name, tier_label, campaign_id, campaign_name, image_url, coin_value, won_at)
    SELECT _claim.user_id, _claim.prize_name, _claim.tier_label, _claim.campaign_id,
           COALESCE(c.title, ''), _claim.image_url, _claim.coin_value, now()
    FROM public.campaigns c
    WHERE c.id = _claim.campaign_id;

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;
