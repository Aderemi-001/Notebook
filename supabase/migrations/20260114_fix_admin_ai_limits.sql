-- Fix AI usage limits for admin users
-- Admins should have unlimited (or very high) AI generation limits

-- Update get_ai_usage_status to check for admin status
CREATE OR REPLACE FUNCTION public.get_ai_usage_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_current_count INTEGER;
    v_limit INTEGER;
    v_is_premium BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT COALESCE(is_admin, false) INTO v_is_admin
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Admins get unlimited (set to 999999 for practical purposes)
    IF v_is_admin THEN
        v_limit := 999999;
        v_is_premium := true;
    ELSE
        -- Check subscription status for non-admins
        SELECT EXISTS(
            SELECT 1 FROM public.subscriptions 
            WHERE user_id = p_user_id 
            AND status IN ('active', 'trialing')
        ) INTO v_is_premium;
        
        -- Set limit based on tier
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

-- Update check_and_increment_ai_usage to check for admin status
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(
    p_user_id UUID,
    p_cards_generated INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    v_current_count INTEGER;
    v_limit INTEGER;
    v_is_premium BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT COALESCE(is_admin, false) INTO v_is_admin
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Admins get unlimited (set to 999999 for practical purposes)
    IF v_is_admin THEN
        v_limit := 999999;
        v_is_premium := true;
    ELSE
        -- Check subscription status for non-admins
        SELECT EXISTS(
            SELECT 1 FROM public.subscriptions 
            WHERE user_id = p_user_id 
            AND status IN ('active', 'trialing')
        ) INTO v_is_premium;
        
        -- Set limit based on tier
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
