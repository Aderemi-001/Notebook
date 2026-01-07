-- Disable Maintenance Mode and Fix Profile Schema

-- 1. Ensure profile columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT false;

-- 2. Toggle Maintenance Mode OFF
-- We use COALESCE and JSONB to ensure we don't overwrite other settings if they existed (though key is unique)
INSERT INTO public.system_settings (key, value, updated_at)
VALUES ('maintenance_mode', '{"active": false}'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET 
    value = '{"active": false}'::jsonb,
    updated_at = now();
