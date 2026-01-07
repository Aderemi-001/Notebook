-- Secure RPC: Get Admin Logs
CREATE OR REPLACE FUNCTION public.admin_get_logs()
RETURNS TABLE (
    id UUID,
    action TEXT,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    admin_email TEXT,
    admin_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.target_id,
        al.details,
        al.created_at,
        au.email::TEXT,
        p.display_name
    FROM public.admin_logs al
    JOIN public.profiles p ON al.admin_id = p.id
    JOIN auth.users au ON p.id = au.id
    ORDER BY al.created_at DESC
    LIMIT 100;
END;
$$;
