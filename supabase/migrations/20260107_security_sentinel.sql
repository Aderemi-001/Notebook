-- Security Sentinel System (v3: Integrated Logging)
-- 1. Create a table to store security alerts
CREATE TABLE IF NOT EXISTS public.security_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'high_volume_creation', 'rapid_login_fail', 'subscription_abuse', 'impersonation_attempt', 'high_cost_ai_usage'
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    details JSONB,
    action_taken TEXT, -- 'none', 'monitored', 'warning_sent', 'account_frozen', 'banned'
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all alerts" ON public.security_alerts;
CREATE POLICY "Admins can view all alerts" ON public.security_alerts
    FOR SELECT USING (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

DROP POLICY IF EXISTS "Admins can update alerts" ON public.security_alerts;
CREATE POLICY "Admins can update alerts" ON public.security_alerts
    FOR UPDATE USING (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- 3. The "Sentinel" Function (Bot Logic with LOGGING)
DROP FUNCTION IF EXISTS public.run_security_scan(boolean);
DROP FUNCTION IF EXISTS public.run_security_scan();

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
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
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
        jsonb_build_object('count', count, 'threshold', 50, 'period', '24h'),
        CASE WHEN p_active_defense AND count > 100 THEN 'banned' ELSE 'monitored' END
    FROM (
        SELECT user_id, count(*) as count
        FROM public.notes
        WHERE created_at > now() - interval '24 hours'
        GROUP BY user_id
        HAVING count(*) > 50
    ) sub
    WHERE NOT EXISTS (
        SELECT 1 FROM public.security_alerts 
        WHERE user_id = sub.user_id 
        AND type = 'high_volume_notes' 
        AND created_at > now() - interval '24 hours'
    );
    GET DIAGNOSTICS v_alerts_created = ROW_COUNT;

    -- SCAN: AI Abuse (Essays > 10 in 24h)
    INSERT INTO public.security_alerts (user_id, type, severity, details, action_taken)
    SELECT 
        user_id, 
        'excessive_ai_usage_essays', 
        'high', 
        jsonb_build_object('count', count, 'threshold', 10, 'period', '24h'),
        'monitored' 
    FROM (
        SELECT user_id, count(*) as count
        FROM public.essay_submissions
        WHERE created_at > now() - interval '24 hours'
        GROUP BY user_id
        HAVING count(*) > 10
    ) sub
    WHERE NOT EXISTS (
        SELECT 1 FROM public.security_alerts 
        WHERE user_id = sub.user_id 
        AND type = 'excessive_ai_usage_essays' 
        AND created_at > now() - interval '24 hours'
    );

    -- SCAN: Impersonation (Critical)
    INSERT INTO public.security_alerts (user_id, type, severity, details, action_taken)
    SELECT 
        id, 
        'impersonation_attempt', 
        'critical', 
        jsonb_build_object('display_name', display_name, 'reason', 'Contains reserved keyword'),
        CASE WHEN p_active_defense THEN 'banned' ELSE 'monitored' END
    FROM public.profiles
    WHERE (
        lower(display_name) LIKE '%admin%' OR 
        lower(display_name) LIKE '%modera%' OR 
        lower(display_name) LIKE '%support%' OR 
        lower(display_name) LIKE '%official%'
    )
    AND is_admin = false
    AND NOT EXISTS (
        SELECT 1 FROM public.security_alerts 
        WHERE user_id = profiles.id 
        AND type = 'impersonation_attempt'
    );

    -- =================================================================================
    -- LAYER 2: ACTIVE PROTECTION (Logging + Enforcement)
    -- =================================================================================
    
    IF p_active_defense THEN
        -- 1. Identify targets for banning
        CREATE TEMPORARY TABLE temp_banned_users AS
        SELECT user_id, type 
        FROM public.security_alerts 
        WHERE created_at > now() - interval '1 minute' 
        AND action_taken = 'banned'
        AND resolved = false;

        -- 2. Execute Ban
        UPDATE public.profiles
        SET is_banned = true
        WHERE id IN (SELECT user_id FROM temp_banned_users);
        
        GET DIAGNOSTICS v_users_banned = ROW_COUNT;

        -- 3. LOG ACTIONS to Central Admin Logs
        INSERT INTO public.admin_logs (admin_id, action, target_id, details)
        SELECT 
            auth.uid(), -- The admin running the bot is "responsible"
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
