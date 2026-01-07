-- Robust Update for Admin Get Users (v5)
-- Explicitly aliasing columns to avoid ambiguity with return table definition

DROP FUNCTION IF EXISTS public.admin_get_users();

CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
    user_id_out UUID,
    email_out TEXT,
    display_name_out TEXT,
    avatar_url_out TEXT,
    is_admin_out BOOLEAN,
    is_banned_out BOOLEAN,
    created_at_out TIMESTAMP WITH TIME ZONE,
    last_sign_in_at_out TIMESTAMP WITH TIME ZONE,
    email_confirmed_at_out TIMESTAMP WITH TIME ZONE,
    subscription_status_out TEXT,
    current_period_end_out TIMESTAMPTZ,
    trial_ends_at_out TIMESTAMPTZ,
    granted_by_email_out TEXT,
    granted_at_out TIMESTAMPTZ,
    granted_duration_out TEXT,
    total_notes_out BIGINT,
    total_sets_out BIGINT,
    is_exempt_out BOOLEAN,
    risk_score_out INT,
    risk_level_out TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Explicitly checking profiles table for admin status using table prefix
    IF NOT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.is_admin = true
    ) THEN
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
        granter.email::TEXT,
        log.created_at,
        log.details->>'duration',
        (SELECT COUNT(*) FROM public.notes n WHERE n.user_id = p.id),
        (SELECT COUNT(*) FROM public.study_sets ss WHERE ss.user_id = p.id),
        CASE WHEN exc.user_id IS NOT NULL THEN true ELSE false END,
        -- Risk Score Calculation
        (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN sa1.severity = 'low' THEN 1
                    WHEN sa1.severity = 'medium' THEN 3
                    WHEN sa1.severity = 'high' THEN 6
                    WHEN sa1.severity = 'critical' THEN 10
                    ELSE 0
                END
            ), 0)::INT 
            FROM public.security_alerts sa1 
            WHERE sa1.user_id = p.id AND sa1.resolved = false
        ),
        -- Risk Level Label
        CASE 
            WHEN (SELECT COUNT(*) FROM public.security_alerts sa2 WHERE sa2.user_id = p.id AND sa2.resolved = false) = 0 THEN 'Low'
            WHEN (SELECT SUM(CASE WHEN sa3.severity = 'critical' THEN 1 ELSE 0 END) FROM public.security_alerts sa3 WHERE sa3.user_id = p.id AND sa3.resolved = false) > 0 THEN 'Critical'
            WHEN (SELECT COUNT(*) FROM public.security_alerts sa4 WHERE sa4.user_id = p.id AND sa4.resolved = false) > 3 THEN 'High'
            ELSE 'Medium'
        END
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

-- Explicitly regrant permissions
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_users() TO service_role;
