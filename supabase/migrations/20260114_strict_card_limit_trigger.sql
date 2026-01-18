-- Strict Daily Rate Limiting Trigger
-- Prevents ANY card creation (Manual or AI) if limit is reached

CREATE TABLE IF NOT EXISTS public.daily_card_limits (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, usage_date)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_daily_card_limits_user_date ON public.daily_card_limits(user_id, usage_date);

-- Enable RLS
ALTER TABLE public.daily_card_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.daily_card_limits
    FOR SELECT USING (auth.uid() = user_id);


-- Trigger Function
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

    -- If no user found (maybe partial insert?), allow (or strict block?)
    -- Assuming foreign key exists, set must exist.
    IF v_user_id IS NULL THEN
        RETURN NEW; 
    END IF;

    -- Check Subscription
    SELECT EXISTS(
        SELECT 1 FROM public.subscriptions 
        WHERE user_id = v_user_id 
        AND status IN ('active', 'trialing')
    ) INTO v_is_premium;

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
    -- We allow the 10th card (count <= limit). 
    -- If v_current_count IS 11, we reject.
    -- Wait, this trigger is BEFORE INSERT usually? 
    -- If BEFORE, we haven't inserted yet.
    -- But we just incremented the counter in the tracking table.
    -- So v_current_count IS the new total.
    -- If new total > limit, we blocked. But we already incremented the counter!
    -- We should check BEFORE incrementing, OR decrement on exception?
    -- Transactions rollback side effects? Yes. Postgres rolls back the counter increment if we Raise Exception.
    
    IF v_current_count > v_limit THEN
        RAISE EXCEPTION 'Daily card creation limit reached (Limit: %, Used: %). Upgrade to Pro for more.', v_limit, v_current_count - 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS check_card_limit_trigger ON public.cards;

CREATE TRIGGER check_card_limit_trigger
    BEFORE INSERT ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_card_creation_limit();
