-- 1. Reset Tables (Safe to drop if this is the first setup or fixing broken schema)
DROP TABLE IF EXISTS public.user_badges;
DROP TABLE IF EXISTS public.badges;

-- 2. Create Badges Table (Matching Frontend Interface)
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- e.g. 'streak-3'
    name TEXT NOT NULL,       -- Display Name
    description TEXT,
    icon_name TEXT,           -- Lucide Icon Name (e.g. 'flame')
    category TEXT DEFAULT 'general', -- 'streak', 'mastery', 'milestone'
    requirement_type TEXT,    -- 'streak', 'cards_mastered'
    requirement_value INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create User Badges Junction
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, badge_id)
);

-- 4. Enable Security
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Public read access" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Users can see own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
-- Allow service/logic to insert (authenticated users inserting their own awards via function or direct if simple)
CREATE POLICY "Users can award own badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Seed Data (Using Correct Columns)
INSERT INTO public.badges (slug, name, description, icon_name, category, requirement_type, requirement_value) VALUES
('first-step', 'First Step', 'Complete your first study session', 'book-open', 'milestone', 'sessions', 1),
('streak-3', 'Streak Starter', 'Reach a 3-day study streak', 'flame', 'streak', 'streak', 3),
('streak-7', 'Week Warrior', 'Reach a 7-day study streak', 'zap', 'streak', 'streak', 7),
('streak-30', 'Monthly Master', 'Reach a 30-day study streak', 'trophy', 'streak', 'streak', 30),
('mastery-10', 'Recall Rookie', 'Master your first 10 cards', 'brain', 'mastery', 'cards_mastered', 10),
('mastery-50', 'Mastermind', 'Master 50 cards', 'target', 'mastery', 'cards_mastered', 50),
('mastery-100', 'Memory Maestro', 'Master 100 cards', 'sparkles', 'mastery', 'cards_mastered', 100)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name;
