-- Add concepts table and relationships for file import
-- This fixes the 406 Not Acceptable error in CreateStudySet.tsx

-- 1. Create concepts table (Metadata for key terms found in files)
CREATE TABLE IF NOT EXISTS concepts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create concept_relationships table (Links between concepts)
CREATE TABLE IF NOT EXISTS concept_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source_concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
    target_concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'related', -- related, part_of, caused_by, etc.
    strength FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, source_concept_id, target_concept_id, type)
);

-- 3. Create card_concepts link table (Links Flashcards to Concepts)
CREATE TABLE IF NOT EXISTS card_concepts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(card_id, concept_id)
);

-- 4. Enable RLS
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_concepts ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
DROP POLICY IF EXISTS "Users can manage their own concepts" ON concepts;
CREATE POLICY "Users can manage their own concepts" ON concepts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own relationships" ON concept_relationships;
CREATE POLICY "Users can manage their own relationships" ON concept_relationships FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own card links" ON card_concepts;
CREATE POLICY "Users can manage their own card links" ON card_concepts FOR ALL USING (auth.uid() = user_id);

-- 6. Grant Permissions (Crucial for 406 fix)
GRANT ALL ON TABLE concepts TO authenticated;
GRANT ALL ON TABLE concepts TO service_role;

GRANT ALL ON TABLE concept_relationships TO authenticated;
GRANT ALL ON TABLE concept_relationships TO service_role;

GRANT ALL ON TABLE card_concepts TO authenticated;
GRANT ALL ON TABLE card_concepts TO service_role;
