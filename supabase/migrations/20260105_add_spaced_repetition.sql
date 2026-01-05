-- Add Spaced Repetition (SM-2) fields to cards table
-- This migration adds the necessary columns for implementing the SM-2 algorithm

-- Add next_review column first (if it doesn't exist)
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS next_review DATE;

-- Add easiness_factor column (default 2.5 as per SM-2 algorithm)
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS easiness_factor FLOAT DEFAULT 2.5;

-- Add repetitions counter (tracks how many times card has been reviewed correctly)
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0;

-- Add interval_days (number of days until next review)
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 0;

-- Backfill existing cards with default next_review date (today) if NULL
UPDATE cards
SET next_review = CURRENT_DATE
WHERE next_review IS NULL;

-- Add index on next_review for faster queries
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review);

-- Comment on columns for documentation
COMMENT ON COLUMN cards.next_review IS 'Date when card should be reviewed next';
COMMENT ON COLUMN cards.easiness_factor IS 'SM-2 algorithm easiness factor (1.3-2.5+)';
COMMENT ON COLUMN cards.repetitions IS 'Number of consecutive correct reviews';
COMMENT ON COLUMN cards.interval_days IS 'Days until next review (SM-2 interval)';
