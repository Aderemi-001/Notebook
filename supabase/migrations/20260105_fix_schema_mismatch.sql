-- ULTIMATE SCHEMA FIX (Run this in Supabase SQL Editor)
-- This script ensures all tables, columns, relations, and permissions are correctly set up.

-- 1. Ensure updated_at exists on all core tables
ALTER TABLE study_sets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure cards table has the right user and review columns
ALTER TABLE cards ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS next_review DATE DEFAULT CURRENT_DATE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS easiness_factor FLOAT DEFAULT 2.5;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0;

-- 3. Ensure foreign key from cards to study_sets (Required for many UI queries)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cards_set_id_fkey') THEN
        ALTER TABLE cards ADD CONSTRAINT cards_set_id_fkey FOREIGN KEY (set_id) REFERENCES study_sets(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Create user_progress table with ALL possible naming variations used in the app
-- The app currently has inconsistent naming in different files. We'll support both to prevent 400s.
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
    
    -- "StudyMode.tsx" convention
    repetition_level INTEGER DEFAULT 0,
    ease_factor FLOAT DEFAULT 2.5,
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'learning',
    
    -- "DashboardStats.tsx" and others expect:
    last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (user_id, card_id)
);

-- 5. Enable RLS and Grant Permissions (Crucial for fixing 400 Bad Request)
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own progress" ON user_progress;
CREATE POLICY "Users can manage their own progress" ON user_progress FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON TABLE user_progress TO authenticated;
GRANT ALL ON TABLE user_progress TO service_role;
GRANT ALL ON TABLE cards TO authenticated;
GRANT ALL ON TABLE cards TO service_role;
GRANT ALL ON TABLE study_sets TO authenticated;
GRANT ALL ON TABLE study_sets TO service_role;

-- 6. Create RPC for Daily Review (Used in DailyReview.tsx)
CREATE OR REPLACE FUNCTION get_daily_review_cards(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    term TEXT,
    definition TEXT,
    repetition_level INTEGER,
    ease_factor FLOAT,
    next_review_at TIMESTAMPTZ,
    status TEXT,
    set_id UUID,
    set_title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.term,
        c.definition,
        COALESCE(up.repetition_level, 0),
        COALESCE(up.ease_factor, 2.5),
        COALESCE(up.next_review_at, NOW()),
        COALESCE(up.status, 'learning'),
        c.set_id,
        s.title as set_title
    FROM cards c
    JOIN study_sets s ON c.set_id = s.id
    LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id = p_user_id
    WHERE s.user_id = p_user_id
    AND (up.next_review_at IS NULL OR up.next_review_at <= NOW())
    ORDER BY up.next_review_at ASC NULLS FIRST, c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Updated At Trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'study_sets'::regclass) THEN
        CREATE TRIGGER set_updated_at BEFORE UPDATE ON study_sets FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'notes'::regclass) THEN
        CREATE TRIGGER set_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'cards'::regclass) THEN
        CREATE TRIGGER set_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
    END IF;
END $$;
