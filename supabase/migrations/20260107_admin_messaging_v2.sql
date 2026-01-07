-- RPC for sending direct messages with tracking
CREATE OR REPLACE FUNCTION public.admin_send_direct_message(
    p_user_ids UUID[],
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_title TEXT DEFAULT 'Admin Notification'
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

    -- Insert notifications for all targeted users
    INSERT INTO public.notifications (user_id, title, message, type, is_read)
    SELECT u_id, p_title, p_message, p_type, false
    FROM unnest(p_user_ids) AS u_id;

    v_count := array_length(p_user_ids, 1);

    -- Log action to admin_logs
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (
        auth.uid(), 
        'DIRECT_MESSAGE', 
        CASE WHEN v_count = 1 THEN p_user_ids[1] ELSE NULL END, 
        jsonb_build_object(
            'message', p_message, 
            'count', v_count, 
            'type', p_type, 
            'title', p_title,
            'recipients', p_user_ids
        )
    );

    RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;
