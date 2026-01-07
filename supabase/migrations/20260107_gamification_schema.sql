-- Add gamification tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_study_date DATE,
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;

-- Create Badges Table
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT, -- Lucide icon name or image URL
    category TEXT DEFAULT 'general', -- 'streak', 'mastery', 'creation', 'social'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read badges
CREATE POLICY "Badges are viewable by everyone" 
ON public.badges FOR SELECT 
USING (true);

-- Only service role/admin can insert/update badges (managed via migrations/seed usually)
-- (Implicitly denied for anon/authenticated by default)

-- Create User Badges Junction Table (earned badges)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g. "streak_days": 7
    UNIQUE(user_id, badge_id)
);

-- Enable RLS on User Badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users can view their own badges (and maybe others for profiles later)
CREATE POLICY "Users can view their own earned badges" 
ON public.user_badges FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON profiles(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
