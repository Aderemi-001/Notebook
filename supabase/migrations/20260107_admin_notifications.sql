-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'alert', 'success', 'broadcast'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies (Safe to re-run due to IF NOT EXISTS logic not being simple for policies, 
-- but we can wrap in DO block or just assume clean slate for this specific migration file)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications'
    ) THEN
        CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications (mark read)'
    ) THEN
        CREATE POLICY "Users can update their own notifications (mark read)" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can delete their own notifications'
    ) THEN
        CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;


-- RPC: Send Direct Message (Single or Multiple Users)
CREATE OR REPLACE FUNCTION public.admin_send_direct_message(
    p_user_ids UUID[],
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_title TEXT DEFAULT 'Notification'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid UUID;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied: Admin only';
    END IF;

    FOREACH v_uid IN ARRAY p_user_ids
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (v_uid, p_title, p_message, p_type);
    END LOOP;

    -- Optional: Log to admin_logs if table exists
    BEGIN
        INSERT INTO public.admin_logs (admin_id, action, target_id, details)
        VALUES (auth.uid(), 'DIRECT_MESSAGE', NULL, jsonb_build_object('count', array_length(p_user_ids, 1), 'title', p_title));
    EXCEPTION WHEN OTHERS THEN
        -- Ignore logging errors (table might not exist)
    END;
END;
$$;

-- RPC: Get Admin Logs (Stub if missing, based on usage)
-- The UI called admin_get_logs, unsure if it exists.
-- Providing a dummy if needed or just letting it fail if it's not the priority.
-- User only complained about send_direct_message.
