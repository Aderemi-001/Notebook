-- Add index for frequent polling query in DashboardLayout
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
