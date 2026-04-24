-- 1) Slugify helper (immutable, ASCII-only, lowercase, hyphenated)
CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    trim(both '-' FROM
      regexp_replace(
        regexp_replace(
          lower(coalesce(_input, '')),
          '[^a-z0-9]+', '-', 'g'
        ),
        '-{2,}', '-', 'g'
      )
    );
$$;

-- 2) Add slug column to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS slug text;

-- 3) Backfill: generate base slug from title; resolve collisions with -2, -3, ...
DO $$
DECLARE
  r RECORD;
  base_slug text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, title FROM public.campaigns WHERE slug IS NULL OR slug = '' LOOP
    base_slug := public.slugify(r.title);
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'campaign-' || substr(r.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.campaigns WHERE slug = candidate AND id <> r.id) LOOP
      n := n + 1;
      candidate := base_slug || '-' || n;
    END LOOP;
    UPDATE public.campaigns SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- 4) Enforce NOT NULL + UNIQUE going forward
ALTER TABLE public.campaigns
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_slug_unique ON public.campaigns(slug);

-- 5) Trigger: auto-generate slug on INSERT/UPDATE if missing or title changed and slug empty
CREATE OR REPLACE FUNCTION public.campaigns_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate text;
  n int;
BEGIN
  -- Only auto-generate when slug is null/empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.slugify(NEW.title);
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'campaign-' || substr(NEW.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    n := 1;
    WHILE EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE slug = candidate AND id <> NEW.id
    ) LOOP
      n := n + 1;
      candidate := base_slug || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  ELSE
    -- Normalize user-provided slug
    NEW.slug := public.slugify(NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaigns_set_slug ON public.campaigns;
CREATE TRIGGER trg_campaigns_set_slug
BEFORE INSERT OR UPDATE OF title, slug ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.campaigns_set_slug();