-- Add cancel_at_period_end if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancel_at_period_end') THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update Admin Grant Premium to include Notification
CREATE OR REPLACE FUNCTION public.admin_grant_premium(target_user_id UUID, duration_interval TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Upsert subscription
    INSERT INTO public.subscriptions (user_id, status, current_period_end, trial_ends_at, cancel_at_period_end)
    VALUES (
        target_user_id, 
        'active', 
        now() + duration_interval::interval, 
        now(),
        false
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        status = 'active', 
        current_period_end = now() + duration_interval::interval,
        cancel_at_period_end = false;

    -- Send Notification
    INSERT INTO public.notifications (user_id, message, type, is_read)
    VALUES (
        target_user_id,
        '🌟 Admin has granted you Pro access for ' || duration_interval || '! Enjoy the upgrade. - Nova Admin',
        'info',
        false
    );

    -- Log it
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'GRANT_PREMIUM', target_user_id, jsonb_build_object('duration', duration_interval));
END;
$$;

-- Update Admin Revoke Premium to include Notification
CREATE OR REPLACE FUNCTION public.admin_revoke_premium(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    UPDATE public.subscriptions 
    SET 
        status = 'canceled',
        current_period_end = now(),
        trial_ends_at = now()
    WHERE user_id = target_user_id;

    -- Send Notification
    INSERT INTO public.notifications (user_id, message, type, is_read)
    VALUES (
        target_user_id,
        'Your Pro subscription has been revoked by an administrator. - Nova Admin',
        'alert',
        false
    );

    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'REVOKE_PREMIUM', target_user_id, '{}'::jsonb);
END;
$$;

-- Create Cancel Subscription RPC for User
CREATE OR REPLACE FUNCTION public.cancel_subscription()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Update to cancel at period end
    UPDATE public.subscriptions
    SET cancel_at_period_end = true
    WHERE user_id = v_user_id;

    -- Send Notification
    INSERT INTO public.notifications (user_id, message, type, is_read)
    VALUES (
        v_user_id,
        'You have successfully canceled your subscription renewal. You will retain access until the end of your current period. - Nova Admin',
        'info',
        false
    );
END;
$$;
