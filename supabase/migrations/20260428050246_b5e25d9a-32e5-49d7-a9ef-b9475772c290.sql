ALTER TABLE public.user_coins REPLICA IDENTITY FULL;
ALTER TABLE public.user_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.redeem_tickets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_coins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.redeem_tickets;