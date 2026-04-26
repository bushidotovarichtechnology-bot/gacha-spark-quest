-- Hide IP and user-agent columns in trade_history from clients.
-- Only admins (via service role / definer functions) and audits should see them.
-- We keep RLS allowing parties to view their rows, but use column-level grants
-- so clients cannot SELECT initiator_ip / responder_ip / user_agent.

REVOKE SELECT ON public.trade_history FROM anon, authenticated;

GRANT SELECT (
  id,
  trade_id,
  initiator_id,
  responder_id,
  items_exchanged,
  tier_label,
  outcome,
  error_reason,
  gas_fee,
  created_at
) ON public.trade_history TO authenticated;
