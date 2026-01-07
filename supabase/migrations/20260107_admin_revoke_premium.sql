-- Revoke premium function
CREATE OR REPLACE FUNCTION public.admin_revoke_premium(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Update subscription
    UPDATE public.subscriptions 
    SET 
        status = 'canceled',
        current_period_end = now(),
        trial_ends_at = now() -- Clear trial if any
    WHERE user_id = target_user_id;

    -- Log it
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'REVOKE_PREMIUM', target_user_id, '{}'::jsonb);
END;
$$;
