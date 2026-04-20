DROP FUNCTION IF EXISTS public.admin_get_banned_users();

CREATE OR REPLACE FUNCTION public.admin_get_banned_users()
 RETURNS TABLE(user_id uuid, email text, ban_reason text, banned_at timestamp with time zone, total_draws bigint, last_draw_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    uc.user_id,
    u.email::text,
    uc.ban_reason,
    uc.banned_at,
    COALESCE((SELECT count(*) FROM public.draws d WHERE d.user_id = uc.user_id), 0)::bigint AS total_draws,
    uc.last_draw_at
  FROM public.user_coins uc
  JOIN auth.users u ON u.id = uc.user_id
  WHERE uc.is_banned = true
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY uc.banned_at DESC NULLS LAST;
$function$;