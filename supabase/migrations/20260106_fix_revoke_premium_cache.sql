-- Fix admin_revoke_premium function cache issue
-- Drop and recreate to force schema cache refresh

DROP FUNCTION IF EXISTS public.admin_revoke_premium(uuid);

CREATE OR REPLACE FUNCTION public.admin_revoke_premium(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Check if executor is an admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied: You must be an administrator.';
    END IF;

    -- 2. Revoke subscription (set to canceled and expire immediately)
    UPDATE public.subscriptions
    SET 
        status = 'canceled',
        current_period_end = now(),
        updated_at = now()
    WHERE user_id = target_user_id;

    -- 3. Log the action
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'REVOKE_PREMIUM', target_user_id, '{}'::jsonb);
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.admin_revoke_premium(uuid) TO authenticated;

-- Force a schema cache reload by notifying the system
NOTIFY pgrst, 'reload schema';
