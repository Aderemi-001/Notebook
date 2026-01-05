-- FORCE ALTER to ensure columns exist on user_progress
-- Previous migrations used CREATE TABLE IF NOT EXISTS, which skips existing tables (missing columns).
-- This script explicitly adds the missing columns.

ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS repetition_level INTEGER DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS ease_factor FLOAT DEFAULT 2.5;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'learning';

-- Re-enable RLS just in case
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Ensure permissions are granted (sometimes lost on re-creation)
    GRANT ALL ON TABLE user_progress TO authenticated;
    GRANT ALL ON TABLE user_progress TO service_role;
END $$;
