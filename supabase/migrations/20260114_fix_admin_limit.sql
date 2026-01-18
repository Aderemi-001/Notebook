CREATE OR REPLACE FUNCTION public.enforce_card_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_limit INTEGER;
    v_current_count INTEGER;
    v_is_premium BOOLEAN;
    v_is_admin BOOLEAN;
BEGIN
    -- Get User ID via Study Set
    SELECT user_id INTO v_user_id
    FROM public.study_sets
    WHERE id = NEW.set_id;

    -- If no user found (maybe partial insert?), allow (or strict block?)
    -- Assuming foreign key exists, set must exist.
    IF v_user_id IS NULL THEN
        RETURN NEW; 
    END IF;

    -- Check Subscription
    SELECT EXISTS(
        SELECT 1 FROM public.subscriptions 
        WHERE user_id = v_user_id 
        AND status IN ('active', 'trialing')
    ) INTO v_is_premium;

    -- Check Admin from profiles
    SELECT COALESCE(is_admin, false) INTO v_is_admin
    FROM public.profiles
    WHERE id = v_user_id;

    -- Admins are effectively Premium
    IF v_is_admin THEN
        v_is_premium := true;
    END IF;

    v_limit := CASE WHEN v_is_premium THEN 500 ELSE 10 END; -- Pro: 500, Free: 10

    -- Get/Update Counter
    INSERT INTO public.daily_card_limits (user_id, usage_date, count)
    VALUES (v_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET 
        count = daily_card_limits.count + 1,
        updated_at = now()
    RETURNING count INTO v_current_count;

    -- Check Limit
    IF v_current_count > v_limit THEN
        RAISE EXCEPTION 'Daily card creation limit reached (Limit: %, Used: %). Upgrade to Pro for more.', v_limit, v_current_count - 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
