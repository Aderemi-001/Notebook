-- Add PayFast Token to Subscriptions
-- Enables tracking and cancellation of PayFast subscriptions

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'payfast_token') THEN
        ALTER TABLE public.subscriptions ADD COLUMN payfast_token TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancel_at_period_end') THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
