-- Create Payments Table and Admin RPCs
-- 1. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    provider TEXT DEFAULT 'payfast',
    provider_ref TEXT,
    plan_type TEXT DEFAULT 'monthly', -- 'monthly', 'yearly', 'lifetime'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON public.payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can insert payments" ON public.payments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
    
-- Service role can do anything (for webhooks)
GRANT ALL ON TABLE public.payments TO service_role;
GRANT SELECT ON TABLE public.payments TO authenticated;


-- 4. RPC: Get Recent Transactions (Admin)
CREATE OR REPLACE FUNCTION public.admin_get_recent_transactions(limit_count INT DEFAULT 10)
RETURNS TABLE (
    id UUID,
    user_email TEXT,
    amount DECIMAL,
    status TEXT,
    plan TEXT,
    provider_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check Admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        au.email::TEXT,
        p.amount,
        p.status,
        p.plan_type,
        p.provider_ref,
        p.created_at
    FROM public.payments p
    LEFT JOIN auth.users au ON p.user_id = au.id
    ORDER BY p.created_at DESC
    LIMIT limit_count;
END;
$$;


-- 5. RPC: Get Revenue Stats
CREATE OR REPLACE FUNCTION public.admin_get_revenue()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_revenue DECIMAL(10, 2);
    month_revenue DECIMAL(10, 2);
    total_revenue DECIMAL(10, 2);
BEGIN
    -- Check Admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Calculate Today (UTC)
    SELECT COALESCE(SUM(amount), 0) INTO today_revenue 
    FROM public.payments 
    WHERE status = 'completed' 
    AND created_at >= current_date;

    -- Calculate Month
    SELECT COALESCE(SUM(amount), 0) INTO month_revenue 
    FROM public.payments 
    WHERE status = 'completed' 
    AND created_at >= date_trunc('month', current_date);

    -- Calculate Total
    SELECT COALESCE(SUM(amount), 0) INTO total_revenue 
    FROM public.payments 
    WHERE status = 'completed';

    RETURN jsonb_build_object(
        'today', today_revenue,
        'month', month_revenue,
        'total', total_revenue
    );
END;
$$;

-- 6. Seed Data (Optional - ensures dashboard isn't empty on first run)
INSERT INTO public.payments (amount, currency, status, provider, plan_type, user_id, created_at)
SELECT 1999.00, 'ZAR', 'completed', 'payfast', 'lifetime', id, now() - interval '1 hour'
FROM auth.users ORDER BY created_at DESC LIMIT 1;

INSERT INTO public.payments (amount, currency, status, provider, plan_type, user_id, created_at)
SELECT 99.00, 'ZAR', 'completed', 'payfast', 'monthly', id, now() - interval '2 hours'
FROM auth.users ORDER BY created_at DESC OFFSET 1 LIMIT 1;

INSERT INTO public.payments (amount, currency, status, provider, plan_type, user_id, created_at)
SELECT 4.00, 'ZAR', 'pending', 'payfast', 'monthly', id, now() - interval '5 minutes'
FROM auth.users ORDER BY created_at DESC LIMIT 1;

