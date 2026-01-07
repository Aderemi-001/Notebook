-- Create a function to send a notification to ALL users
CREATE OR REPLACE FUNCTION public.admin_send_global_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check if admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied: Admin only';
    END IF;

    -- Insert into notifications for all users
    WITH inserted AS (
        INSERT INTO public.notifications (user_id, title, message, type, is_read)
        SELECT id, p_title, p_message, p_type, false
        FROM public.profiles
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM inserted;

    -- Log action
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (
        auth.uid(), 
        'GLOBAL_NOTIFICATION', 
        NULL, 
        jsonb_build_object('title', p_title, 'count', v_count, 'type', p_type)
    );

    RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;
