-- Fix get_daily_review_cards to support set filtering
DROP FUNCTION IF EXISTS public.get_daily_review_cards(uuid, integer);
DROP FUNCTION IF EXISTS public.get_daily_review_cards(p_user_id uuid, p_limit integer);

CREATE OR REPLACE FUNCTION public.get_daily_review_cards(
    p_user_id UUID, 
    p_limit INTEGER DEFAULT 20,
    p_set_ids UUID[] DEFAULT NULL
)
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
        COALESCE(up.repetition_level, 0) as repetition_level,
        COALESCE(up.ease_factor, 2.5) as ease_factor,
        COALESCE(up.next_review_at, NOW()) as next_review_at,
        COALESCE(up.status, 'learning') as status,
        c.set_id,
        s.title as set_title
    FROM cards c
    JOIN study_sets s ON c.set_id = s.id
    LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id = p_user_id
    WHERE s.user_id = p_user_id
    AND (p_set_ids IS NULL OR c.set_id = ANY(p_set_ids))
    AND (up.next_review_at IS NULL OR up.next_review_at <= NOW())
    ORDER BY up.next_review_at ASC NULLS FIRST, c.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_daily_review_cards(uuid, integer, uuid[]) TO authenticated;
