
CREATE OR REPLACE FUNCTION public.search_campaigns(_q text, _lim int DEFAULT 8)
RETURNS TABLE (
  campaign_id text,
  slug text,
  title text,
  image_url text,
  price integer,
  matched_prize text,
  match_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT NULLIF(btrim(_q), '') AS term
  ),
  pat AS (
    SELECT '%' || term || '%' AS like_term FROM q WHERE term IS NOT NULL
  ),
  by_title AS (
    SELECT
      c.id AS campaign_id,
      c.slug,
      c.title,
      c.image_url,
      c.price,
      NULL::text AS matched_prize,
      'campaign'::text AS match_type,
      0 AS rank
    FROM public.campaigns c, pat
    WHERE c.is_active = true
      AND c.title ILIKE pat.like_term
  ),
  by_prize AS (
    SELECT DISTINCT ON (c.id)
      c.id AS campaign_id,
      c.slug,
      c.title,
      c.image_url,
      c.price,
      tp.name AS matched_prize,
      'prize'::text AS match_type,
      1 AS rank
    FROM public.campaigns c
    JOIN public.campaign_tiers ct ON ct.campaign_id = c.id
    JOIN public.tier_prizes tp ON tp.tier_id = ct.id
    , pat
    WHERE c.is_active = true
      AND tp.name ILIKE pat.like_term
    ORDER BY c.id, length(tp.name) ASC
  ),
  combined AS (
    SELECT * FROM by_title
    UNION ALL
    SELECT * FROM by_prize
  ),
  dedup AS (
    SELECT DISTINCT ON (campaign_id)
      campaign_id, slug, title, image_url, price, matched_prize, match_type, rank
    FROM combined
    ORDER BY campaign_id, rank ASC
  )
  SELECT campaign_id, slug, title, image_url, price, matched_prize, match_type
  FROM dedup
  ORDER BY rank ASC, title ASC
  LIMIT GREATEST(_lim, 1);
$$;

GRANT EXECUTE ON FUNCTION public.search_campaigns(text, int) TO anon, authenticated;
