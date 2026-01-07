-- Drop the old function signature to avoid ambiguity
DROP FUNCTION IF EXISTS public.admin_grant_premium(uuid);

-- Recreate with duration parameter
CREATE OR REPLACE FUNCTION public.admin_grant_premium(target_user_id UUID, duration_interval TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Upsert subscription
    -- Cast the duration text to an interval
    INSERT INTO public.subscriptions (user_id, status, current_period_end, trial_ends_at)
    VALUES (
        target_user_id, 
        'active', 
        now() + duration_interval::interval, 
        now() -- Satisfy NOT NULL
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        status = 'active', 
        current_period_end = now() + duration_interval::interval;

    -- Log it
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'GRANT_PREMIUM', target_user_id, jsonb_build_object('duration', duration_interval));
END;
$$;
