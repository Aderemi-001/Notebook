-- Drop the old function first to avoid return type conflict
DROP FUNCTION IF EXISTS public.admin_get_users();

CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check permissions
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'email', au.email,
                    'display_name', p.display_name,
                    'avatar_url', p.avatar_url,
                    'is_admin', p.is_admin,
                    'is_banned', p.is_banned,
                    'created_at', p.created_at,
                    'subscription_status', COALESCE(s.status, 'none')
                ) ORDER BY p.created_at DESC
            ),
            '[]'::jsonb
        )
        FROM public.profiles p
        JOIN auth.users au ON p.id = au.id
        LEFT JOIN public.subscriptions s ON p.id = s.user_id
    );
END;
$$;
