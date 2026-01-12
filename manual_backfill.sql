-- RUN THIS IN SUPABASE SQL EDITOR
-- This script will:
-- 1. Switch the user to "Pro"
-- 2. Create a Transaction Log entry so it shows up in your Admin Dashboard

DO $$
DECLARE
  -- ⬇️ CHANGE THIS EMAIL IF NEEDED ⬇️
  target_email TEXT := 'anthony.adesanmi4@gmail.com'; 
  
  target_user_id UUID;
BEGIN
  -- 1. Find User ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE NOTICE '❌ User not found! Check the email address.';
    RETURN;
  END IF;

  -- 2. Unlock Subscription
  INSERT INTO public.subscriptions (user_id, status, plan_id, current_period_end, updated_at)
  VALUES (target_user_id, 'active', 'pro-monthly', NOW() + INTERVAL '30 days', NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active', 
      plan_id = 'pro-monthly', 
      current_period_end = NOW() + INTERVAL '30 days',
      updated_at = NOW();
      
  -- 3. Update User Metadata (Just in case your app relies on this too)
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    '{"is_pro": true, "subscription_status": "active"}'::jsonb
  WHERE id = target_user_id;

  -- 4. Log the "Missing" Transaction (So it shows in Admin Panel)
  INSERT INTO public.payment_transactions (user_id, amount, status, provider, provider_ref, metadata)
  VALUES (
    target_user_id, 
    15.00, 
    'completed', 
    'manual-fix', 
    'manual-' || to_char(now(), 'YYYYMMDDHHMISS'), 
    '{"note": "Manually fixed missing PayFast transaction"}'::jsonb
  );
  
  RAISE NOTICE '✅ Success! User % is now Pro and transaction logged.', target_email;

END $$;
