-- 1. Add is_banned to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- 2. System Settings Table (for Broadcasts & Maintenance Mode)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on Settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies for system_settings
CREATE POLICY "Everyone can read system settings" ON public.system_settings FOR SELECT USING (true);

CREATE POLICY "Admins can update system settings" ON public.system_settings FOR UPDATE USING (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

CREATE POLICY "Admins can insert system settings" ON public.system_settings FOR INSERT WITH CHECK (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 3. Admin Activity Log
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read logs" ON public.admin_logs FOR SELECT USING (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

CREATE POLICY "Admins can insert logs" ON public.admin_logs FOR INSERT WITH CHECK (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 4. Secure RPC: Get All Users (Admin Only)
-- This joins auth.users to get emails, which usually isn't accessible to public
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN,
    is_banned BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    subscription_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        au.email::TEXT,
        p.display_name,
        p.avatar_url,
        p.is_admin,
        p.is_banned,
        p.created_at,
        COALESCE(s.status, 'none')::TEXT
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    LEFT JOIN public.subscriptions s ON p.id = s.user_id
    ORDER BY p.created_at DESC;
END;
$$;

-- 5. Secure RPC: Ban User
CREATE OR REPLACE FUNCTION public.admin_ban_user(target_user_id UUID, ban BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    UPDATE public.profiles SET is_banned = ban WHERE id = target_user_id;

    -- Log it
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), CASE WHEN ban THEN 'BAN_USER' ELSE 'UNBAN_USER' END, target_user_id, jsonb_build_object('banned', ban));
END;
$$;

-- 6. Secure RPC: Admin Stats
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_users INT;
    active_subs INT;
    banned_users INT;
    admins INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    SELECT COUNT(*) INTO total_users FROM public.profiles;
    SELECT COUNT(*) INTO active_subs FROM public.subscriptions WHERE status = 'active';
    SELECT COUNT(*) INTO banned_users FROM public.profiles WHERE is_banned = true;
    SELECT COUNT(*) INTO admins FROM public.profiles WHERE is_admin = true;

    RETURN jsonb_build_object(
        'total_users', total_users,
        'active_subscriptions', active_subs,
        'banned_users', banned_users,
        'admins', admins
    );
END;
$$;

-- 7. Grant Premium (Admin Only)
CREATE OR REPLACE FUNCTION public.admin_grant_premium(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Upsert fake subscription
    INSERT INTO public.subscriptions (user_id, status, current_period_end, trial_ends_at)
    VALUES (target_user_id, 'active', now() + interval '1 year', null)
    ON CONFLICT (user_id) 
    DO UPDATE SET status = 'active', current_period_end = now() + interval '1 year';

    -- Log it
    INSERT INTO public.admin_logs (admin_id, action, target_id, details)
    VALUES (auth.uid(), 'GRANT_PREMIUM', target_user_id, '{}'::jsonb);
END;
$$;
