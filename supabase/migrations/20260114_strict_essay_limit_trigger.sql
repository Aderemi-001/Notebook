-- Strict Essay Limits Trigger (Consolidated & Safe)
-- Enforces 3 Graded Essays Total (across essay_responses and essay_submissions)
-- Enforces 3 Generated Questions Total

CREATE OR REPLACE FUNCTION public.enforce_essay_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_is_premium BOOLEAN;
    v_count_1 INTEGER;
    v_count_2 INTEGER;
    v_total_count INTEGER;
    v_limit INTEGER;
    v_table_name TEXT;
    v_is_draft_content BOOLEAN := false;
BEGIN
    v_user_id := NEW.user_id;

    -- Check Subscription
    SELECT EXISTS(
        SELECT 1 FROM public.subscriptions 
        WHERE user_id = v_user_id 
        AND status IN ('active', 'trialing')
    ) INTO v_is_premium;

    v_table_name := TG_TABLE_NAME;

    -- 1. Generated Questions Check
    IF v_table_name = 'essay_questions' THEN
        -- Limit Generated Questions (3 for Free per Day)
        v_limit := CASE WHEN v_is_premium THEN 300 ELSE 3 END;
        
        SELECT count(*) INTO v_count_1
        FROM public.essay_questions
        WHERE user_id = v_user_id
        AND created_at >= CURRENT_DATE;
        
        IF v_count_1 >= v_limit THEN
            RAISE EXCEPTION 'Daily limit reached: Free users can only generate % questions per day.', v_limit;
        END IF;

    -- 2. Responses / Submissions Check
    ELSIF v_table_name = 'essay_responses' OR v_table_name = 'essay_submissions' THEN
        
        -- Determine if current row is a draft
        IF v_table_name = 'essay_responses' THEN
            -- Safe cast or direct check if column exists, assuming table has is_draft
            -- We interpret the record as a JSON object to safely access fields if unsure, 
            -- but mostly just separating the IF block is enough for PLPGSQL parser.
            IF NEW.is_draft THEN
                v_is_draft_content := true;
            END IF;
        ELSIF v_table_name = 'essay_submissions' THEN
            IF NEW.letter_grade = 'Draft' THEN
                v_is_draft_content := true;
            END IF;
        END IF;

        -- If it is a draft, we DO NOT limit it. Return immediately.
        IF v_is_draft_content THEN
            RETURN NEW;
        END IF;

        -- It is a Graded Essay (Submit). Check Limits.
        v_limit := CASE WHEN v_is_premium THEN 100 ELSE 3 END;
        
        -- Count existing graded essays (Combined) from TODAY
        SELECT count(*) INTO v_count_1
        FROM public.essay_responses
        WHERE user_id = v_user_id
        AND is_draft = false
        AND created_at >= CURRENT_DATE;

        SELECT count(*) INTO v_count_2
        FROM public.essay_submissions
        WHERE user_id = v_user_id
        AND letter_grade != 'Draft'
        AND created_at >= CURRENT_DATE;

        v_total_count := v_count_1 + v_count_2;

        -- If INSERTing a new Graded Essay, check if we crossed limit
        -- (Ideally simple >= check is enough; if 3 exist, trying to add 4th fails)
        IF v_total_count >= v_limit THEN
             RAISE EXCEPTION 'Daily limit reached: You have used %/% graded essays today.', v_total_count, v_limit;
        END IF;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for all 3 tables
DROP TRIGGER IF EXISTS check_essay_questions_limit ON public.essay_questions;
CREATE TRIGGER check_essay_questions_limit
    BEFORE INSERT ON public.essay_questions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_essay_limits();

DROP TRIGGER IF EXISTS check_essay_responses_limit ON public.essay_responses;
CREATE TRIGGER check_essay_responses_limit
    BEFORE INSERT ON public.essay_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_essay_limits();

DROP TRIGGER IF EXISTS check_essay_submissions_limit ON public.essay_submissions;
CREATE TRIGGER check_essay_submissions_limit
    BEFORE INSERT ON public.essay_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_essay_limits();
