-- Fix Payment Transactions and Admin PRC
-- 1. Ensure table exists with correct schema matching frontend
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
    provider TEXT DEFAULT 'payfast',
    provider_ref TEXT, -- pf_payment_id
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add columns if they missed (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_transactions' AND column_name = 'plan_type') THEN
        ALTER TABLE public.payment_transactions ADD COLUMN plan_type TEXT DEFAULT 'monthly';
    END IF;
END $$;


-- 3. Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;
CREATE POLICY "Users can view own transactions" ON public.payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.payment_transactions;
CREATE POLICY "Users can insert own transactions" ON public.payment_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.payment_transactions;
CREATE POLICY "Admins can view all transactions" ON public.payment_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Service role manages transactions" ON public.payment_transactions;
CREATE POLICY "Service role manages transactions" ON public.payment_transactions
    FOR ALL USING (true) WITH CHECK (true); -- simplified for service role trigger/functions

-- Grants
GRANT ALL ON TABLE public.payment_transactions TO service_role;
GRANT SELECT, INSERT ON TABLE public.payment_transactions TO authenticated;


-- 5. RPC: Get Recent Transactions (Admin) - Pointing to CORRECT table
DROP FUNCTION IF EXISTS public.admin_get_recent_transactions(INT);
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
        COALESCE(p.plan_type, p.metadata->>'plan')::TEXT as plan,
        p.provider_ref,
        p.created_at
    FROM public.payment_transactions p
    LEFT JOIN auth.users au ON p.user_id = au.id
    ORDER BY p.created_at DESC
    LIMIT limit_count;
END;
$$;


-- 6. RPC: Get Revenue Stats - Pointing to CORRECT table
DROP FUNCTION IF EXISTS public.admin_get_revenue();
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
    FROM public.payment_transactions 
    WHERE status = 'completed' 
    AND created_at >= current_date;

    -- Calculate Month
    SELECT COALESCE(SUM(amount), 0) INTO month_revenue 
    FROM public.payment_transactions 
    WHERE status = 'completed' 
    AND created_at >= date_trunc('month', current_date);

    -- Calculate Total
    SELECT COALESCE(SUM(amount), 0) INTO total_revenue 
    FROM public.payment_transactions 
    WHERE status = 'completed';

    RETURN jsonb_build_object(
        'today', today_revenue,
        'month', month_revenue,
        'total', total_revenue
    );
END;
$$;
