-- Secure RPC: Get Admin Logs (Fix V2)
-- Resolves 'column must appear in GROUP BY' error by using a subquery for ordering

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
                    'id', t.id,
                    'action', t.action,
                    'target_id', t.target_id,
                    'details', t.details,
                    'created_at', t.created_at,
                    'admin_email', t.email,
                    'admin_name', t.display_name
                )
            ),
            '[]'::jsonb
        )
        FROM (
            SELECT 
                al.id,
                al.action,
                al.target_id,
                al.details,
                al.created_at,
                au.email,
                p.display_name
            FROM public.admin_logs al
            JOIN public.profiles p ON al.admin_id = p.id
            JOIN auth.users au ON p.id = au.id
            ORDER BY al.created_at DESC
            LIMIT 100
        ) t
    );
END;
$$;
