-- Add has_used_trial column to subscriptions if it doesn't exist
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE;

-- Function to start a 3-day pro trial
CREATE OR REPLACE FUNCTION public.start_pro_trial()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_subscription public.subscriptions%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check existing subscription
    SELECT * INTO v_subscription FROM public.subscriptions WHERE user_id = v_user_id;

    IF v_subscription.has_used_trial THEN
        RAISE EXCEPTION 'Trial already used';
    END IF;

    -- Allow starting trial if:
    -- 1. No subscription exists
    -- 2. Subscription exists but has_used_trial is FALSE (e.g., previous manual grant or paid without trial?)
    --    Actually, if they paid, we might usually consider trial "used" or irrelevant, but strict interpretation is fine.
    
    INSERT INTO public.subscriptions (user_id, status, trial_ends_at, current_period_end, has_used_trial)
    VALUES (
        v_user_id,
        'trialing',
        now() + interval '3 days',
        now() + interval '3 days',
        TRUE
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        status = 'trialing',
        trial_ends_at = now() + interval '3 days',
        current_period_end = now() + interval '3 days',
        has_used_trial = TRUE;
END;
$$;
