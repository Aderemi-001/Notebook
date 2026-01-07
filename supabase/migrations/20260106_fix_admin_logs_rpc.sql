-- Secure RPC: Get Admin Logs (Fix)
-- Drops the old function and recreates it returning JSONB for better PostgREST compatibility

DROP FUNCTION IF EXISTS public.admin_get_logs();

CREATE OR REPLACE FUNCTION public.admin_get_logs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check Admin Permissions
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', al.id,
                    'action', al.action,
                    'target_id', al.target_id,
                    'details', al.details,
                    'created_at', al.created_at,
                    'admin_email', au.email,
                    'admin_name', p.display_name
                )
            ),
            '[]'::jsonb
        )
        FROM public.admin_logs al
        JOIN public.profiles p ON al.admin_id = p.id
        JOIN auth.users au ON p.id = au.id
        ORDER BY al.created_at DESC
        LIMIT 100
    );
END;
$$;
