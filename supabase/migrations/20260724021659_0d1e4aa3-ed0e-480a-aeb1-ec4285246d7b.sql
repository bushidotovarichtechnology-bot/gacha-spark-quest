-- Hide IP / user-agent columns from party access (authenticated role).
-- Only service_role (edge functions, admin ops) can read these.
REVOKE SELECT (initiator_ip, initiator_user_agent) ON public.trades FROM authenticated;
REVOKE SELECT (initiator_ip, initiator_user_agent) ON public.trades FROM anon;

REVOKE SELECT (initiator_ip, responder_ip) ON public.trade_history FROM authenticated;
REVOKE SELECT (initiator_ip, responder_ip) ON public.trade_history FROM anon;