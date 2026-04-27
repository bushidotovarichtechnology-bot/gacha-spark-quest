ALTER TABLE public.coin_ledger DROP CONSTRAINT IF EXISTS coin_ledger_entry_type_check;
ALTER TABLE public.coin_ledger ADD CONSTRAINT coin_ledger_entry_type_check
  CHECK (entry_type = ANY (ARRAY[
    'topup'::text,
    'recycle'::text,
    'claim_shipping'::text,
    'gift_sent'::text,
    'gift_received'::text,
    'coupon'::text,
    'admin_adjust'::text,
    'draw_cost'::text,
    'trade_gas_fee'::text
  ]));