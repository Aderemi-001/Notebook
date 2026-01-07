-- SECURITY EXEMPTIONS SYSTEM ("Diplomatic Immunity")
-- Allows admins to whitelist specific users from the Security Sentinel's auto-bans.
-- V2 UPDATE: Added Hard-coded "Admin Safety Override" to prevent friendly fire.

-- 1. Create the Exceptions Table
CREATE TABLE IF NOT EXISTS public.security_exceptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.security_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage exceptions" ON public.security_exceptions;
CREATE POLICY "Admins can manage exceptions" ON public.security_exceptions
    FOR ALL USING (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- 3. Update the Sentinel Function to respect Immunity AND Admin Safety
DROP FUNCTION IF EXISTS public.run_security_scan(boolean);

CREATE OR REPLACE FUNCTION public.run_security_scan(p_active_defense BOOLEAN DEFAULT false)
RETURNS TABLE (
    alerts_created INT,
    users_banned INT,
    users_flagged INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_alerts_created INT := 0;
    v_users_banned INT := 0;
BEGIN
    -- Layer 0: Access Control
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- =================================================================================
    -- LAYER 1: DETECTION (Scanning for Anomalies)
    -- =================================================================================
    
    -- SCAN: Content Spam (Notes > 50 in 24h)
    INSERT INTO public.security_alerts (user_id, type, severity, details, action_taken)
    SELECT 
        user_id, 
        'high_volume_notes', 
        'medium', 
        jsonb_build_object('count', count, 'threshold', 50, 'period', '24h', 'reason', 'Possible script usage'),
        CASE 
            WHEN p_active_defense AND count > 100 THEN 'banned' 
            ELSE 'monitored' 
        END
    FROM (
        SELECT user_id, count(*) as count
        FROM public.notes
        WHERE created_at > now() - interval '24 hours'
        GROUP BY user_id
        HAVING count(*) > 50
    ) sub
    WHERE NOT EXISTS (SELECT 1 FROM public.security_alerts WHERE user_id = sub.user_id AND type = 'high_volume_notes' AND created_at > now() - interval '24 hours')
    AND NOT EXISTS (SELECT 1 FROM public.security_exceptions WHERE user_id = sub.user_id) -- RESPECT IMMUNITY
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = sub.user_id AND is_admin = true); -- ADMIN SAFETY OVERRIDE
    
    GET DIAGNOSTICS v_alerts_created = ROW_COUNT;

    -- SCAN: AI Abuse (Essays > 10 in 24h)
    INSERT INTO public.security_alerts (user_id, type, severity, details, action_taken)
    SELECT 
        user_id, 
        'excessive_ai_usage_essays', 
        'high', 
        jsonb_build_object('count', count, 'threshold', 10, 'period', '24h', 'desc', 'High Cost AI Usage'),
        'monitored' 
    FROM (
        SELECT user_id, count(*) as count
        FROM public.essay_submissions
        WHERE created_at > now() - interval '24 hours'
        GROUP BY user_id
        HAVING count(*) > 10
    ) sub
    WHERE NOT EXISTS (SELECT 1 FROM public.security_alerts WHERE user_id = sub.user_id AND type = 'excessive_ai_usage_essays' AND created_at > now() - interval '24 hours')
    AND NOT EXISTS (SELECT 1 FROM public.security_exceptions WHERE user_id = sub.user_id) -- RESPECT IMMUNITY
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = sub.user_id AND is_admin = true); -- ADMIN SAFETY OVERRIDE

    -- SCAN: Impersonation (Critical)
    INSERT INTO public.security_alerts (user_id, type, severity, details, action_taken)
    SELECT 
        prof.id, 
        'impersonation_attempt', 
        'critical', 
        jsonb_build_object('display_name', prof.display_name, 'reason', 'Contains reserved keyword'),
        CASE WHEN p_active_defense THEN 'banned' ELSE 'monitored' END
    FROM public.profiles prof
    WHERE (
        lower(prof.display_name) LIKE '%admin%' OR 
        lower(prof.display_name) LIKE '%modera%' OR 
        lower(prof.display_name) LIKE '%support%' OR 
        lower(prof.display_name) LIKE '%official%'
    )
    AND prof.is_admin = false -- ALREADY PRESENT, but key for logic
    AND NOT EXISTS (SELECT 1 FROM public.security_alerts WHERE user_id = prof.id AND type = 'impersonation_attempt');

    -- =================================================================================
    -- LAYER 2: ACTIVE PROTECTION (Logging + Enforcement)
    -- =================================================================================
    
    IF p_active_defense THEN
        -- 1. Identify targets for banning
        CREATE TEMPORARY TABLE temp_banned_users AS
        SELECT user_id, type 
        FROM public.security_alerts sa
        WHERE created_at > now() - interval '1 minute' 
        AND action_taken = 'banned'
        AND resolved = false
        AND NOT EXISTS (SELECT 1 FROM public.security_exceptions se WHERE se.user_id = sa.user_id) -- Exemption Check
        AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = sa.user_id AND p.is_admin = true); -- CRITICAL ADMIN FAILSAFE

        -- 2. Execute Ban (Only non-admins)
        UPDATE public.profiles
        SET is_banned = true
        WHERE id IN (SELECT user_id FROM temp_banned_users);
        
        GET DIAGNOSTICS v_users_banned = ROW_COUNT;

        -- 3. LOG ACTIONS
        INSERT INTO public.admin_logs (admin_id, action, target_id, details)
        SELECT 
            auth.uid(), 
            'SENTINEL_AUTO_BAN',
            user_id,
            jsonb_build_object('reason', type, 'bot_action', true)
        FROM temp_banned_users;

        -- 4. Mark alerts as resolved
        UPDATE public.security_alerts
        SET resolved = true, details = details || '{"auto_resolved": true}'::jsonb
        WHERE action_taken = 'banned'
        AND created_at > now() - interval '1 minute';
        
        DROP TABLE temp_banned_users;
    END IF;

    RETURN QUERY SELECT v_alerts_created, v_users_banned, v_alerts_created;
END;
$$;
