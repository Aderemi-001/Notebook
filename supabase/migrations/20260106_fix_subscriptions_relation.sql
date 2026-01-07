-- Fix relationship between profiles and subscriptions for PostgREST

-- We add a foreign key from subscriptions to profiles.
-- This allows: .from('profiles').select('..., subscriptions(...)')

DO $$
BEGIN
    -- Check if the constraint already exists to avoid errors
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_profile_id_fkey') THEN
        -- We assume public.profiles exists and has id as PK similar to auth.users
        ALTER TABLE public.subscriptions
        ADD CONSTRAINT subscriptions_profile_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;
