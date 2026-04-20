INSERT INTO public.app_settings (key, value)
VALUES ('midtrans_mode', '{"mode":"sandbox"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Ensure key is unique so admins can upsert
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_unique ON public.app_settings(key);