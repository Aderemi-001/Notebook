-- Secure RPC: Delete User (Admin Only)
-- Deletes the user from auth.users (cascades to public.profiles)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Permission Check
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Delete from auth.users (Cascades to public tables)
    DELETE FROM auth.users WHERE id = target_user_id;

    -- Log Action
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'DELETE_USER', target_user_id, '{}'::jsonb);
END;
$$;

-- Secure RPC: Remove MFA Factors (Admin Only)
CREATE OR REPLACE FUNCTION public.admin_remove_mfa(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Permission Check
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Delete from auth.mfa_factors
    DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;

    -- Log Action
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'REMOVE_MFA', target_user_id, '{}'::jsonb);
END;
$$;
