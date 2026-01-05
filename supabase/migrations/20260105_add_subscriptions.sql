-- Subscriptions & Trial Logic (v2.1)
-- Run this in Supabase SQL Editor

-- 1. Create Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'trialing', -- 'active', 'trialing', 'expired', 'canceled'
    trial_ends_at TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Users can view their own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Auto-enrollment trigger (3-Day Trial)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
  VALUES (new.id, 'trialing', now() + interval '3 days');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- 6. Grant Permissions
GRANT ALL ON TABLE subscriptions TO authenticated;
GRANT ALL ON TABLE subscriptions TO service_role;
