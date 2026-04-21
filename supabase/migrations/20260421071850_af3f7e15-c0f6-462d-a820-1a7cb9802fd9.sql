INSERT INTO public.app_settings (key, value)
VALUES ('maintenance_mode', '{"enabled": false, "message": "", "estimated_time": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;