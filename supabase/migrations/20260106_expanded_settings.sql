-- Expanded Profile and Preferences Migration

-- 1. Create user_preferences if it doesn't exist (safety)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    default_flashcard_side TEXT NOT NULL DEFAULT 'term',
    confirm_deletion BOOLEAN NOT NULL DEFAULT true,
    default_num_exam_questions INTEGER NOT NULL DEFAULT 10,
    default_exam_question_types TEXT[] DEFAULT ARRAY['multiple_choice', 'short_answer'],
    daily_cards_goal INTEGER NOT NULL DEFAULT 20,
    enable_review_reminders BOOLEAN NOT NULL DEFAULT true,
    default_study_session_cards_count INTEGER NOT NULL DEFAULT 20,
    default_card_sort_order TEXT NOT NULL DEFAULT 'next_review_at_asc',
    hide_mastered_from_daily_review BOOLEAN NOT NULL DEFAULT false,
    font_size_preference TEXT NOT NULL DEFAULT 'medium',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add new columns to user_preferences
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS enable_sound_effects BOOLEAN DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS enable_tts BOOLEAN DEFAULT false;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS enable_animations BOOLEAN DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- 3. Add richer profile columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT false;

-- 4. Enable RLS on user_preferences if not enabled
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can manage their own preferences') THEN
        CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Grant Permissions
GRANT ALL ON TABLE public.user_preferences TO authenticated;
GRANT ALL ON TABLE public.user_preferences TO service_role;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
