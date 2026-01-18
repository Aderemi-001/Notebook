-- Fix relationship between study_sets and profiles for PostgREST
-- This solves "Could not find a relationship between 'study_sets' and 'profiles'" 

DO $$
BEGIN
    -- 1. Add foreign key from study_sets to profiles if missing
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'study_sets_user_id_profiles_fkey') THEN
        ALTER TABLE public.study_sets
        ADD CONSTRAINT study_sets_user_id_profiles_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;

    -- 2. Create library table for "Add to My Sets" functionality
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_study_set_library') THEN
        CREATE TABLE public.user_study_set_library (
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            set_id UUID REFERENCES public.study_sets(id) ON DELETE CASCADE,
            added_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (user_id, set_id)
        );

        -- Enable RLS
        ALTER TABLE public.user_study_set_library ENABLE ROW LEVEL SECURITY;

        -- Policies
        CREATE POLICY "Users can manage their own library"
        ON public.user_study_set_library FOR ALL
        USING (auth.uid() = user_id);

        -- Permissions
        GRANT ALL ON TABLE public.user_study_set_library TO authenticated;
        GRANT ALL ON TABLE public.user_study_set_library TO service_role;
    END IF;
END $$;
