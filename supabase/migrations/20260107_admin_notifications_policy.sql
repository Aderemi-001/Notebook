-- Allow admins to insert notifications for ANY user (Direct Messaging)
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Also allow admins to SELECT all notifications (for moderation/logs, if needed, though mostly they just insert)
-- Ideally we might want them to see what they sent, but the UI is "Fire and Forget" currently. 
-- Adding SELECT capability for admins just in case.
CREATE POLICY "Admins can select all notifications"
ON public.notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);
