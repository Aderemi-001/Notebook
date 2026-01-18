-- Create study_set_groups table for organizing study sets
CREATE TABLE IF NOT EXISTS study_set_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure unique group names per user to prevent confusion
  CONSTRAINT unique_group_name_per_user UNIQUE (user_id, name)
);

-- Enable RLS
ALTER TABLE study_set_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_set_groups
CREATE POLICY "Users can view their own groups"
  ON study_set_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own groups"
  ON study_set_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own groups"
  ON study_set_groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own groups"
  ON study_set_groups FOR DELETE
  USING (auth.uid() = user_id);

-- Add group_id column to study_sets if it doesn't exist
ALTER TABLE study_sets 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES study_set_groups(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_sets_group_id ON study_sets(group_id);
CREATE INDEX IF NOT EXISTS idx_study_set_groups_user_id ON study_set_groups(user_id);

-- Add updated_at trigger for study_set_groups
CREATE OR REPLACE FUNCTION update_study_set_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_study_set_groups_updated_at
  BEFORE UPDATE ON study_set_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_study_set_groups_updated_at();
