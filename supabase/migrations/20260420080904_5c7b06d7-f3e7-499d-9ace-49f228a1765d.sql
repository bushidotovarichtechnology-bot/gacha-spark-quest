ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';