CREATE OR REPLACE FUNCTION public.get_grand_prize_winners(lim integer DEFAULT 20)
RETURNS TABLE(
  draw_id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  prize_name text,
  campaign_id text,
  campaign_title text,
  won_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id AS draw_id,
    d.user_id,
    COALESCE(NULLIF(p.display_name, ''), 'Player') AS display_name,
    COALESCE(p.avatar_url, '') AS avatar_url,
    d.prize_name,
    d.campaign_id,
    COALESCE(c.title, '') AS campaign_title,
    d.created_at AS won_at
  FROM public.draws d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  LEFT JOIN public.campaigns c ON c.id = d.campaign_id
  WHERE d.tier_label = 'S'
  ORDER BY d.created_at DESC
  LIMIT lim;
$$;