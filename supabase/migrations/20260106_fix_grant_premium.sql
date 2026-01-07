-- Fix admin_grant_premium to satisfy NOT NULL constraint on trial_ends_at
CREATE OR REPLACE FUNCTION public.admin_grant_premium(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Upsert subscription
    -- Fix: Set trial_ends_at to now() instead of null because the column is NOT NULL
    INSERT INTO public.subscriptions (user_id, status, current_period_end, trial_ends_at)
    VALUES (target_user_id, 'active', now() + interval '1 year', now())
    ON CONFLICT (user_id) 
    DO UPDATE SET status = 'active', current_period_end = now() + interval '1 year';

    -- Log it
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'GRANT_PREMIUM', target_user_id, '{}'::jsonb);
END;
$$;
