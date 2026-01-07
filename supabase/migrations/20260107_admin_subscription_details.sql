-- Update admin_get_users to return subscription details, grantor info, and duration
DROP FUNCTION IF EXISTS public.admin_get_users();

CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN,
    is_banned BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    subscription_status TEXT,
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    granted_by_email TEXT,
    granted_at TIMESTAMPTZ,
    granted_duration TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        au.email::TEXT,
        p.display_name,
        p.avatar_url,
        p.is_admin,
        p.is_banned,
        p.created_at,
        COALESCE(s.status, 'none')::TEXT,
        s.current_period_end,
        s.trial_ends_at,
        granter.email::TEXT as granted_by_email,
        log.created_at as granted_at,
        log.details->>'duration' as granted_duration
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    LEFT JOIN public.subscriptions s ON p.id = s.user_id
    -- Find the last GRANT_PREMIUM action for this user
    LEFT JOIN LATERAL (
        SELECT admin_id, created_at, details
        FROM public.admin_logs 
        WHERE target_id = p.id AND action = 'GRANT_PREMIUM'
        ORDER BY created_at DESC 
        LIMIT 1
    ) log ON true
    LEFT JOIN auth.users granter ON log.admin_id = granter.id
    ORDER BY p.created_at DESC;
END;
$$;
