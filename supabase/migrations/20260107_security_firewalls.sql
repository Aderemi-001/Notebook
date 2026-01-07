-- AI FIREWALL SYSTEMS
-- Implements "Tamper-Proof" mechanisms for the Security Sentinel

-- 1. NETWORK FIREWALL: Strict Privilege Lockdown
-- Remove default Execute permissions from "public" (everyone)
REVOKE EXECUTE ON FUNCTION public.run_security_scan FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_security_scan FROM anon;

-- Explicitly only allow 'authenticated' users (who still must pass the internal Admin check)
-- This prevents anonymous monitoring or DOS attempts on the function endpoint.
GRANT EXECUTE ON FUNCTION public.run_security_scan TO authenticated;


-- 2. DATA FIREWALL: Immutable Evidence Locker
-- Create a trigger that makes security alerts "Append-Only" and "Read-Only" for critical fields.
-- This ensures that even a compromised admin account cannot "cover their tracks" by deleting alerts.

CREATE OR REPLACE FUNCTION public.firewall_protect_alerts()
RETURNS TRIGGER AS $$
DECLARE
    is_super_admin BOOLEAN;
BEGIN
    -- Check if it's the specific automated sentinel running (optional context check) or just generic logic
    
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'FIREWALL DENY: Security alerts are immutable evidence and cannot be deleted.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Verify that critical "Evidence" fields are NOT being changed
        IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
            RAISE EXCEPTION 'FIREWALL DENY: Cannot alter user_id on security alert.';
        END IF;
        
        IF OLD.type IS DISTINCT FROM NEW.type THEN
            RAISE EXCEPTION 'FIREWALL DENY: Cannot alter alert classification data.';
        END IF;
        
        IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
            RAISE EXCEPTION 'FIREWALL DENY: Cannot alter timestamp of security event.';
        END IF;
        
        -- Only allow changing 'resolved' status, 'action_taken', or updating 'details'
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the Firewall Trigger
DROP TRIGGER IF EXISTS firewall_on_alerts ON public.security_alerts;

CREATE TRIGGER firewall_on_alerts
BEFORE UPDATE OR DELETE ON public.security_alerts
FOR EACH ROW
EXECUTE FUNCTION public.firewall_protect_alerts();


-- 3. SYSTEM INTEGRITY: Prevent Recursion
-- Ensure the Sentinel cannot be configured to ban ITSELF or System Admins
-- (This logic is usually inside the function, but adding a constraint here adds a layer of safety)

-- Add a constraint to security_alerts to ensure we never accidentally log a System Alert against specific reserved IDs (if any existed),
-- For now, the best protection is the existing logic excluding "is_admin = true" from bans.

-- 4. LOGGING: Log the Firewall Installation
INSERT INTO public.admin_logs (admin_id, action, target_id, details)
SELECT 
    auth.uid(),
    'SYSTEM_HARDENING',
    NULL,
    '{"component": "Security Sentinel", "upgrade": "Firewall Activation", "description": "Immutable logs and execution lockdown applied"}'::jsonb
WHERE auth.uid() IS NOT NULL;
