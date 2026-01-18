-- Update get_daily_review_cards to support Set Filtering (Customizable Review)

CREATE OR REPLACE FUNCTION public.get_daily_review_cards(
    p_user_id UUID, 
    p_limit INTEGER DEFAULT 20,
    p_set_ids UUID[] DEFAULT NULL -- Optional filter for specific sets
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
        COALESCE(up.repetition_level, 0)::INTEGER as repetition_level,
        COALESCE(up.ease_factor, 2.5)::FLOAT as ease_factor,
        COALESCE(up.next_review_at, NOW()) as next_review_at,
        COALESCE(up.status, 'learning') as status,
        c.set_id,
        s.title as set_title
    FROM cards c
    JOIN study_sets s ON c.set_id = s.id
    LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id = p_user_id
    WHERE 
        -- User Access Logic (Owned or In-Progress)
        (s.user_id = p_user_id OR up.card_id IS NOT NULL)
        
        -- Due Date Logic
        AND (up.next_review_at IS NULL OR up.next_review_at <= NOW())
        
        -- Set Filtering Logic (If provided)
        AND (p_set_ids IS NULL OR c.set_id = ANY(p_set_ids))
        
    ORDER BY 
        -- "Nova Algorithm" Priority:
        -- 1. Very overdue cards first? No, stick to standard Inter-Arrival Time logic (ASC).
        -- 2. New cards (NULL) are mixed or handled by frontend? 
        -- Standard SRS: Priority is usually by Due Date.
        up.next_review_at ASC NULLS FIRST, 
        c.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
