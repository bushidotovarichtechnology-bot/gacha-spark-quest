-- ============================================================
-- 1. Tabel coin_ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coin_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  entry_type    text NOT NULL CHECK (entry_type IN (
    'topup','recycle','claim_shipping','gift_sent','gift_received','coupon','admin_adjust','draw_cost'
  )),
  amount        integer NOT NULL,            -- positif = masuk, negatif = keluar
  balance_after integer,                     -- saldo setelah perubahan (boleh null jika tak terdefinisi)
  description   text NOT NULL DEFAULT '',
  reference_id  text,                        -- id transaksi / inventory / claim terkait (text agar fleksibel)
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coin_ledger_user_created_idx
  ON public.coin_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS coin_ledger_type_idx
  ON public.coin_ledger (entry_type);

ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ledger" ON public.coin_ledger;
CREATE POLICY "Users can view own ledger"
ON public.coin_ledger
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all ledger" ON public.coin_ledger;
CREATE POLICY "Admins can view all ledger"
ON public.coin_ledger
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Tidak ada policy INSERT/UPDATE/DELETE: hanya SECURITY DEFINER functions/triggers yang menulis.

-- ============================================================
-- 2. Update recycle_inventory_item: tulis entry ledger
-- ============================================================
CREATE OR REPLACE FUNCTION public.recycle_inventory_item(_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _item record;
  _new_balance integer;
  _gain integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _item FROM public.user_inventory
   WHERE id = _item_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  _gain := COALESCE(_item.coin_value, 0);

  DELETE FROM public.user_inventory WHERE id = _item_id;

  UPDATE public.user_coins
     SET balance = balance + _gain,
         updated_at = now()
   WHERE user_id = _user_id
   RETURNING balance INTO _new_balance;

  -- Tulis entry ledger
  INSERT INTO public.coin_ledger(user_id, entry_type, amount, balance_after, description, reference_id, metadata)
  VALUES (
    _user_id,
    'recycle',
    _gain,
    _new_balance,
    'Daur ulang hadiah: ' || COALESCE(_item.prize_name, 'Tanpa nama'),
    _item_id::text,
    jsonb_build_object(
      'tier_label', _item.tier_label,
      'campaign_id', _item.campaign_id,
      'campaign_name', _item.campaign_name,
      'image_url', _item.image_url,
      'prize_name', _item.prize_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'coins_gained', _gain,
    'new_balance', _new_balance
  );
END;
$function$;

-- ============================================================
-- 3. Trigger: catat top-up koin saat transaction berubah ke 'settlement'
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_transaction_settlement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _bal integer;
BEGIN
  -- Hanya tulis ledger saat status berubah menjadi settlement (sekali saja)
  IF NEW.status = 'settlement' AND COALESCE(OLD.status, '') <> 'settlement' THEN
    SELECT balance INTO _bal FROM public.user_coins WHERE user_id = NEW.user_id;

    -- Hindari duplikasi jika trigger pernah jalan untuk transaksi ini
    IF NOT EXISTS (
      SELECT 1 FROM public.coin_ledger
       WHERE entry_type = 'topup' AND reference_id = NEW.id::text
    ) THEN
      INSERT INTO public.coin_ledger(user_id, entry_type, amount, balance_after, description, reference_id, metadata)
      VALUES (
        NEW.user_id,
        'topup',
        COALESCE(NEW.coins, 0),
        _bal,
        'Top-up koin (' || COALESCE(NEW.coins, 0)::text || ' koin)',
        NEW.id::text,
        jsonb_build_object(
          'order_id', NEW.order_id,
          'amount_idr', NEW.amount,
          'package_id', NEW.package_id,
          'payment_type', NEW.payment_type
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_log_transaction_settlement ON public.transactions;
CREATE TRIGGER trg_log_transaction_settlement
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.log_transaction_settlement();

-- ============================================================
-- 4. Trigger: catat biaya ongkir jika dibayar pakai koin (future-proof)
--    Saat ini ongkir dibayar via Midtrans terpisah; trigger hanya tulis ledger
--    jika ada metadata 'paid_with_coins' = true di prize_claims (nantinya kalau ditambahkan).
--    Untuk visibilitas, kita juga tulis catatan informatif (amount=0) saat shipping_paid menjadi true,
--    sehingga user melihat aktivitas pengambilan hadiah di halaman transaksi.
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_prize_claim_shipping()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _bal integer;
BEGIN
  IF NEW.shipping_paid = true AND COALESCE(OLD.shipping_paid, false) = false THEN
    SELECT balance INTO _bal FROM public.user_coins WHERE user_id = NEW.user_id;

    -- Hindari duplikasi
    IF NOT EXISTS (
      SELECT 1 FROM public.coin_ledger
       WHERE entry_type = 'claim_shipping' AND reference_id = NEW.id::text
    ) THEN
      INSERT INTO public.coin_ledger(user_id, entry_type, amount, balance_after, description, reference_id, metadata)
      VALUES (
        NEW.user_id,
        'claim_shipping',
        0,  -- ongkir saat ini dibayar via Midtrans (uang asli), bukan koin → amount koin = 0
        _bal,
        'Pengambilan hadiah: ' || COALESCE(NEW.prize_name, 'Tanpa nama'),
        NEW.id::text,
        jsonb_build_object(
          'tier_label', NEW.tier_label,
          'campaign_id', NEW.campaign_id,
          'shipping_method', NEW.shipping_method,
          'shipping_cost_idr', NEW.shipping_cost,
          'recipient_name', NEW.recipient_name,
          'city', NEW.city,
          'province', NEW.province,
          'image_url', NEW.image_url,
          'prize_name', NEW.prize_name
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_log_prize_claim_shipping ON public.prize_claims;
CREATE TRIGGER trg_log_prize_claim_shipping
AFTER UPDATE ON public.prize_claims
FOR EACH ROW
EXECUTE FUNCTION public.log_prize_claim_shipping();