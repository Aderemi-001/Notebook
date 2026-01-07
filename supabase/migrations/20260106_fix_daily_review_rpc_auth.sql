-- Fix RPC by removing user_id param and using auth.uid() directly
-- This matches the frontend call signature: supabase.rpc('get_daily_review_cards')

DROP FUNCTION IF EXISTS public.get_daily_review_cards(uuid, integer);
DROP FUNCTION IF EXISTS public.get_daily_review_cards(uuid);

CREATE OR REPLACE FUNCTION public.get_daily_review_cards(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    term TEXT,
    definition TEXT,
    repetition_level INTEGER,
    ease_factor FLOAT,
    next_review_at TIMESTAMPTZ,
    status TEXT,
    set_id UUID,
    set_title TEXT,
    study_set_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.term,
        c.definition,
        COALESCE(up.repetition_level, 0) as repetition_level,
        COALESCE(up.ease_factor, 2.5) as ease_factor,
        COALESCE(up.next_review_at, NOW()) as next_review_at,
        COALESCE(up.status, 'learning') as status,
        c.set_id,
        s.title as set_title,
        c.set_id as study_set_id
    FROM cards c
    JOIN study_sets s ON c.set_id = s.id
    LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id = auth.uid()
    WHERE s.user_id = auth.uid()
    AND (up.next_review_at IS NULL OR up.next_review_at <= NOW())
    ORDER BY up.next_review_at ASC NULLS FIRST, c.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_daily_review_cards(integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
