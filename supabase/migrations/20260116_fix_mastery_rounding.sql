-- Fix Mastery Rate Rounding for Web/Mobile Parity
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
    sets_mastered bigint,
    concept_gems bigint,
    mastery_rate integer,
    streak integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_sets_mastered bigint := 0;
    v_concept_gems bigint := 0;
    v_mastery_rate integer := 0;
    v_streak integer := 0;
    
    total_cards_reviewed bigint := 0;
    mastered_cards bigint := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- 1. Concept Gems
    SELECT count(*) INTO v_concept_gems
    FROM public.concepts
    WHERE user_id = v_user_id;

    -- 2. Mastery Rate (with Rounding for parity with Frontend)
    SELECT 
        count(*),
        count(*) FILTER (WHERE status = 'mastered' OR repetition_level >= 4)
    INTO total_cards_reviewed, mastered_cards
    FROM public.user_progress
    WHERE user_id = v_user_id;

    IF total_cards_reviewed > 0 THEN
        v_mastery_rate := ROUND((mastered_cards::float * 100.0) / total_cards_reviewed::float)::integer;
    ELSE
        v_mastery_rate := 0;
    END IF;

    -- 3. Sets Mastered Logic
    WITH set_stats AS (
        SELECT 
            c.set_id,
            count(c.id) AS total_set_cards,
            count(up.card_id) FILTER (WHERE up.status = 'mastered' OR up.repetition_level >= 4) AS user_mastered_cards
        FROM public.cards c
        JOIN public.user_progress up ON c.id = up.card_id
        WHERE up.user_id = v_user_id
        GROUP BY c.set_id
    )
    SELECT count(*) INTO v_sets_mastered
    FROM set_stats
    WHERE total_set_cards > 0 
      AND (user_mastered_cards::float / total_set_cards::float) >= 0.8;

    -- 4. Streak
    SELECT current_streak INTO v_streak
    FROM public.profiles 
    WHERE id = v_user_id;

    RETURN QUERY SELECT 
        v_sets_mastered, 
        v_concept_gems, 
        v_mastery_rate, 
        COALESCE(v_streak, 0);
END;
$$;
