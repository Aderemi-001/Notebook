-- AI Rate Limiting System
-- Tracks daily AI card generation usage per user

CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    generation_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, usage_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage_tracking(user_id, usage_date);

-- Enable RLS
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only view their own usage
CREATE POLICY "Users can view own AI usage"
    ON public.ai_usage_tracking
    FOR SELECT
    USING (auth.uid() = user_id);

-- RPC: Check and increment AI usage
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
    -- Check subscription status
    SELECT EXISTS(
        SELECT 1 FROM public.subscriptions 
        WHERE user_id = p_user_id 
        AND status IN ('active', 'trialing')
    ) INTO v_is_premium;
    
    -- Set limit based on tier
    v_limit := CASE WHEN v_is_premium THEN 200 ELSE 10 END;
    
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

-- RPC: Get current AI usage status
CREATE OR REPLACE FUNCTION public.get_ai_usage_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_current_count INTEGER;
    v_limit INTEGER;
    v_is_premium BOOLEAN;
BEGIN
    -- Check subscription status
    SELECT EXISTS(
        SELECT 1 FROM public.subscriptions 
        WHERE user_id = p_user_id 
        AND status IN ('active', 'trialing')
    ) INTO v_is_premium;
    
    -- Set limit based on tier
    v_limit := CASE WHEN v_is_premium THEN 200 ELSE 10 END;
    
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_status(UUID) TO authenticated;
