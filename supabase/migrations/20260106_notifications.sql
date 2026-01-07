-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own notifications" 
ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 2. Trigger Function for Premium Upgrade
CREATE OR REPLACE FUNCTION public.handle_subscription_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed to 'active' from something else (or if it's a new active sub)
    IF (NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active')) THEN
        INSERT INTO public.notifications (user_id, title, message)
        VALUES (
            NEW.user_id, 
            'Welcome to Premium! 🌟', 
            'You have successfully upgraded to the Pro plan. Enjoy unlimited access to all features!'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS on_subscription_status_change ON public.subscriptions;

CREATE TRIGGER on_subscription_status_change
AFTER UPDATE OR INSERT ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_update();
