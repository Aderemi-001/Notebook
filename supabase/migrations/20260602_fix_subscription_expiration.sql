-- Database fix for subscription and trial expiration
-- Centered helper function to check premium status securely including expiration checks

CREATE OR REPLACE FUNCTION public.check_is_user_premium(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_premium BOOLEAN;
BEGIN
    -- Check if user is admin (admins have full access)
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id AND is_admin = true
    ) THEN
        RETURN true;
    END IF;

    -- Check subscription active status
    SELECT EXISTS(
        SELECT 1 FROM public.subscriptions
        WHERE user_id = p_user_id
        AND (
            (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
            OR
            (status = 'trialing' AND (trial_ends_at IS NULL OR trial_ends_at > now()))
        )
    ) INTO v_is_premium;

    RETURN COALESCE(v_is_premium, false);
END;
$$;

-- 1. Update Card Creation Limit
CREATE OR REPLACE FUNCTION public.enforce_card_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_limit INTEGER;
    v_current_count INTEGER;
    v_is_premium BOOLEAN;
BEGIN
    -- Get User ID via Study Set
    SELECT user_id INTO v_user_id
    FROM public.study_sets
    WHERE id = NEW.set_id;

    IF v_user_id IS NULL THEN
        RETURN NEW; 
    END IF;

    -- Check Subscription
    v_is_premium := public.check_is_user_premium(v_user_id);

    v_limit := CASE WHEN v_is_premium THEN 500 ELSE 10 END; -- Pro: 500, Free: 10

    -- Get/Update Counter
    INSERT INTO public.daily_card_limits (user_id, usage_date, count)
    VALUES (v_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET 
        count = daily_card_limits.count + 1,
        updated_at = now()
    RETURNING count INTO v_current_count;

    -- Check Limit
    IF v_current_count > v_limit THEN
        RAISE EXCEPTION 'Daily card creation limit reached (Limit: %, Used: %). Upgrade to Pro for more.', v_limit, v_current_count - 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Essay Creation/Generation Limits
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
    v_is_premium := public.check_is_user_premium(v_user_id);

    v_table_name := TG_TABLE_NAME;

    -- Generated Questions Check
    IF v_table_name = 'essay_questions' THEN
        v_limit := CASE WHEN v_is_premium THEN 300 ELSE 3 END;
        
        SELECT count(*) INTO v_count_1
        FROM public.essay_questions
        WHERE user_id = v_user_id
        AND created_at >= CURRENT_DATE;
        
        IF v_count_1 >= v_limit THEN
            RAISE EXCEPTION 'Daily limit reached: Free users can only generate % questions per day.', v_limit;
        END IF;

    -- Responses / Submissions Check
    ELSIF v_table_name = 'essay_responses' OR v_table_name = 'essay_submissions' THEN
        IF v_table_name = 'essay_responses' THEN
            IF NEW.is_draft THEN
                v_is_draft_content := true;
            END IF;
        ELSIF v_table_name = 'essay_submissions' THEN
            IF NEW.letter_grade = 'Draft' THEN
                v_is_draft_content := true;
            END IF;
        END IF;

        IF v_is_draft_content THEN
            RETURN NEW;
        END IF;

        v_limit := CASE WHEN v_is_premium THEN 100 ELSE 3 END;
        
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

        IF v_total_count >= v_limit THEN
             RAISE EXCEPTION 'Daily limit reached: You have used %/% graded essays today.', v_total_count, v_limit;
        END IF;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update File Upload Verification
CREATE OR REPLACE FUNCTION public.validate_file_upload(
    p_user_id UUID,
    p_file_type TEXT,
    p_file_size BIGINT
)
RETURNS JSON AS $$
DECLARE
    v_is_premium BOOLEAN;
    v_max_size BIGINT;
    v_is_premium_type BOOLEAN;
BEGIN
    v_is_premium := public.check_is_user_premium(p_user_id);
    
    -- Check if file type requires premium
    v_is_premium_type := (
        p_file_type ILIKE '%.pptx' OR 
        p_file_type ILIKE '%.docx' OR 
        p_file_type LIKE 'image/%' OR
        p_file_type ILIKE 'application/vnd.openxmlformats-officedocument.presentationml.presentation' OR
        p_file_type ILIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    -- Validate premium file types
    IF v_is_premium_type AND NOT v_is_premium THEN
        RETURN json_build_object(
            'allowed', false,
            'error', 'Premium feature. PowerPoint, Word, and Image uploads require Pro. Upgrade to unlock.',
            'reason', 'premium_file_type'
        );
    END IF;
    
    -- Validate file size (10MB free, 45MB premium)
    v_max_size := CASE WHEN v_is_premium THEN 47185920 ELSE 10485760 END;
    
    IF p_file_size > v_max_size THEN
        RETURN json_build_object(
            'allowed', false,
            'error', format('File too large. Limit: %sMB. %s', 
                v_max_size / 1048576,
                CASE WHEN NOT v_is_premium THEN 'Upgrade to Pro for 45MB uploads.' ELSE '' END
            ),
            'reason', 'file_size_limit',
            'max_size', v_max_size,
            'current_size', p_file_size
        );
    END IF;
    
    -- All checks passed
    RETURN json_build_object(
        'allowed', true,
        'is_premium', v_is_premium,
        'max_size', v_max_size
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update AI Usage Status RPCs
CREATE OR REPLACE FUNCTION public.get_ai_usage_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_current_count INTEGER;
    v_limit INTEGER;
    v_is_premium BOOLEAN;
BEGIN
    v_is_premium := public.check_is_user_premium(p_user_id);
    
    -- Admins check
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND is_admin = true) THEN
        v_limit := 999999;
    ELSE
        v_limit := CASE WHEN v_is_premium THEN 200 ELSE 10 END;
    END IF;
    
    -- Get today's usage
    SELECT COALESCE(generation_count, 0) INTO v_current_count
    FROM public.ai_usage_tracking
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
    
    RETURN json_build_object(
        'current', COALESCE(v_current_count, 0),
        'limit', v_limit,
        'remaining', GREATEST(0, v_limit - COALESCE(v_current_count, 0)),
        'is_premium', v_is_premium
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(
    p_user_id UUID,
    p_cards_generated INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    v_current_count INTEGER;
    v_limit INTEGER;
    v_is_premium BOOLEAN;
BEGIN
    v_is_premium := public.check_is_user_premium(p_user_id);
    
    -- Admins check
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND is_admin = true) THEN
        v_limit := 999999;
    ELSE
        v_limit := CASE WHEN v_is_premium THEN 200 ELSE 10 END;
    END IF;
    
    -- Get or create today's usage
    INSERT INTO public.ai_usage_tracking (user_id, usage_date, generation_count)
    VALUES (p_user_id, CURRENT_DATE, 0)
    ON CONFLICT (user_id, usage_date) DO NOTHING;
    
    SELECT generation_count INTO v_current_count
    FROM public.ai_usage_tracking
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
    
    -- Check if limit exceeded
    IF v_current_count >= v_limit THEN
        RETURN json_build_object(
            'allowed', false,
            'current', v_current_count,
            'limit', v_limit,
            'is_premium', v_is_premium,
            'remaining', 0
        );
    END IF;
    
    -- Increment usage
    UPDATE public.ai_usage_tracking
    SET generation_count = generation_count + p_cards_generated,
        updated_at = now()
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
    
    RETURN json_build_object(
        'allowed', true,
        'current', v_current_count + p_cards_generated,
        'limit', v_limit,
        'is_premium', v_is_premium,
        'remaining', v_limit - (v_current_count + p_cards_generated)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update Magic Fix Usage
CREATE OR REPLACE FUNCTION public.check_magic_fix_usage()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_pro boolean;
  v_count int;
  v_limit int := 3; -- Limit set to 3
BEGIN
  v_is_pro := public.check_is_user_premium(v_user_id);

  -- Pro users have no limit
  IF v_is_pro THEN
    RETURN json_build_object('allowed', true, 'remaining', 9999, 'is_pro', true);
  END IF;

  -- Check today's usage
  SELECT usage_count INTO v_count 
  FROM magic_fix_tracking 
  WHERE user_id = v_user_id AND usage_date = current_date;

  v_count := coalesce(v_count, 0);

  IF v_count >= v_limit THEN
    RETURN json_build_object('allowed', false, 'remaining', 0, 'is_pro', false);
  ELSE
    RETURN json_build_object('allowed', true, 'remaining', v_limit - v_count, 'is_pro', false);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_magic_fix_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_pro boolean;
BEGIN
  v_is_pro := public.check_is_user_premium(v_user_id);

  -- Do not increment for Pro users
  IF v_is_pro THEN RETURN; END IF;

  -- Increment count for today
  INSERT INTO magic_fix_tracking (user_id, usage_date, usage_count)
  VALUES (v_user_id, current_date, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET usage_count = magic_fix_tracking.usage_count + 1;
END;
$$;

-- 6. Update admin users query to report expired status dynamically
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
    user_id_out UUID,
    email_out TEXT,
    display_name_out TEXT,
    avatar_url_out TEXT,
    is_admin_out BOOLEAN,
    is_banned_out BOOLEAN,
    created_at_out TIMESTAMP WITH TIME ZONE,
    last_sign_in_at_out TIMESTAMP WITH TIME ZONE,
    email_confirmed_at_out TIMESTAMP WITH TIME ZONE,
    subscription_status_out TEXT,
    current_period_end_out TIMESTAMPTZ,
    trial_ends_at_out TIMESTAMPTZ,
    granted_by_email_out TEXT,
    granted_at_out TIMESTAMPTZ,
    granted_duration_out TEXT,
    total_notes_out BIGINT,
    total_sets_out BIGINT,
    is_exempt_out BOOLEAN,
    risk_score_out INT,
    risk_level_out TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        au.email::TEXT,
        p.display_name,
        p.avatar_url,
        p.is_admin,
        p.is_banned,
        p.created_at,
        au.last_sign_in_at,
        au.email_confirmed_at,
        CASE 
            WHEN s.status = 'trialing' AND s.trial_ends_at < now() THEN 'expired'
            WHEN s.status = 'active' AND s.current_period_end < now() THEN 'expired'
            ELSE COALESCE(s.status, 'none')
        END::TEXT,
        s.current_period_end,
        s.trial_ends_at,
        granter.email::TEXT,
        log.created_at,
        log.details->>'duration',
        (SELECT COUNT(*) FROM public.notes n WHERE n.user_id = p.id),
        (SELECT COUNT(*) FROM public.study_sets ss WHERE ss.user_id = p.id),
        CASE WHEN exc.user_id IS NOT NULL THEN true ELSE false END,
        (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN sa1.severity = 'low' THEN 1
                    WHEN sa1.severity = 'medium' THEN 3
                    WHEN sa1.severity = 'high' THEN 6
                    WHEN sa1.severity = 'critical' THEN 10
                    ELSE 0
                END
            ), 0)::INT 
            FROM public.security_alerts sa1 
            WHERE sa1.user_id = p.id AND sa1.resolved = false
        ),
        CASE 
            WHEN (SELECT COUNT(*) FROM public.security_alerts sa2 WHERE sa2.user_id = p.id AND sa2.resolved = false) = 0 THEN 'Low'
            WHEN (SELECT SUM(CASE WHEN sa3.severity = 'critical' THEN 1 ELSE 0 END) FROM public.security_alerts sa3 WHERE sa3.user_id = p.id AND sa3.resolved = false) > 0 THEN 'Critical'
            WHEN (SELECT COUNT(*) FROM public.security_alerts sa4 WHERE sa4.user_id = p.id AND sa4.resolved = false) > 3 THEN 'High'
            ELSE 'Medium'
        END
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    LEFT JOIN public.subscriptions s ON p.id = s.user_id
    LEFT JOIN public.security_exceptions exc ON p.id = exc.user_id
    LEFT JOIN LATERAL (
        SELECT admin_id, created_at, details
        FROM public.admin_logs 
        WHERE target_id = p.id AND action = 'GRANT_PREMIUM'
        ORDER BY created_at DESC 
        LIMIT 1
    ) log ON true
    LEFT JOIN auth.users granter ON log.admin_id = granter.id
    ORDER BY au.last_sign_in_at DESC NULLS LAST;
END;
$$;
