-- SECURITY AUTOMATION: Autonomous Sweeps (Every 4 Hours)
-- This script sets up a scheduled job to run the Sentinel bot in the background.

-- 0. ENABLE EXTENSION
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Ensure system_settings has a key for security_mode
INSERT INTO public.system_settings (key, value)
VALUES ('security_sentinel_mode', '{"active_defense": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Create the Autonomous Wrapper Function
-- This function reads the current admin preference from system_settings and executes the scan.
CREATE OR REPLACE FUNCTION public.autonomous_security_scan()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_defense BOOLEAN;
BEGIN
    -- Get the current mode (Passive/Active) from system settings
    SELECT (value->>'active_defense')::BOOLEAN INTO v_active_defense
    FROM public.system_settings
    WHERE key = 'security_sentinel_mode';

    -- Default to false if not found
    v_active_defense := COALESCE(v_active_defense, false);

    -- Run the scan
    -- We pass the current enforcement preference to the main bot logic
    PERFORM public.run_security_scan(v_active_defense);

    -- Log the autonomous sweep to the admin logs
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    SELECT 
        id, 
        'SENTINEL_AUTONOMOUS_SWEEP', 
        NULL, 
        jsonb_build_object('active_defense', v_active_defense, 'timestamp', now())
    FROM public.profiles 
    WHERE is_admin = true 
    LIMIT 1; -- Log as the first available admin (or system if we had a system user)
END;
$$;

-- 3. Schedule the job (Every 4 Hours)
-- CRON Syntax: '0 */4 * * *' (At minute 0 of every 4th hour)
-- Note: This requires pg_cron to be active on your Supabase project.

-- First, ensure pg_cron is available (only if you have permissions)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the scan
SELECT cron.schedule(
    'sentinel-4-hour-sweep', -- Job Name
    '0 */4 * * *',           -- Every 4 hours
    'SELECT public.autonomous_security_scan();'
);

-- 4. Secure the functions
REVOKE ALL ON FUNCTION public.autonomous_security_scan() FROM public;
GRANT EXECUTE ON FUNCTION public.autonomous_security_scan() TO service_role;
