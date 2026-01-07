-- Update Admin Get Users to include Neural Risk Score (v4)
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
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    subscription_status TEXT,
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    granted_by_email TEXT,
    granted_at TIMESTAMPTZ,
    granted_duration TEXT,
    total_notes BIGINT,
    total_sets BIGINT,
    is_exempt BOOLEAN,
    risk_score INT, -- New Field: 0 to 10
    risk_level TEXT  -- New Field: 'Low', 'Medium', 'High', 'Critical'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
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
        au.last_sign_in_at,
        au.email_confirmed_at,
        COALESCE(s.status, 'none')::TEXT,
        s.current_period_end,
        s.trial_ends_at,
        granter.email::TEXT as granted_by_email,
        log.created_at as granted_at,
        log.details->>'duration' as granted_duration,
        (SELECT COUNT(*) FROM public.notes WHERE user_id = p.id) as total_notes,
        (SELECT COUNT(*) FROM public.study_sets WHERE user_id = p.id) as total_sets,
        CASE WHEN exc.user_id IS NOT NULL THEN true ELSE false END as is_exempt,
        -- Risk Score Calculation
        (SELECT COALESCE(SUM(
            CASE 
                WHEN severity = 'low' THEN 1
                WHEN severity = 'medium' THEN 3
                WHEN severity = 'high' THEN 6
                WHEN severity = 'critical' THEN 10
                ELSE 0
            END
        ), 0)::INT FROM public.security_alerts WHERE user_id = p.id AND resolved = false) as risk_score,
        -- Risk Level Label
        CASE 
            WHEN (SELECT COUNT(*) FROM public.security_alerts WHERE user_id = p.id AND resolved = false) = 0 THEN 'Low'
            WHEN (SELECT SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) FROM public.security_alerts WHERE user_id = p.id AND resolved = false) > 0 THEN 'Critical'
            WHEN (SELECT COUNT(*) FROM public.security_alerts WHERE user_id = p.id AND resolved = false) > 3 THEN 'High'
            ELSE 'Medium'
        END as risk_level
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    LEFT JOIN public.subscriptions s ON p.id = s.user_id
    LEFT JOIN public.security_exceptions exc ON p.id = exc.user_id
    LEFT JOIN LATERAL (
        SELECT admin_id, created_at, details
        FROM public.admin_logs 
        WHERE target_id = p.id AND action = 'GRANT_PREMIUM'
        ORDER BY created_at DESC 
        LIMIT 1
    ) log ON true
    LEFT JOIN auth.users granter ON log.admin_id = granter.id
    ORDER BY au.last_sign_in_at DESC NULLS LAST;
END;
$$;
