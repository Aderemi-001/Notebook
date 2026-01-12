-- Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    component_stack TEXT,
    url TEXT,
    user_agent TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Policies

-- Allow any authenticated user to INSERT (to capture their errors)
CREATE POLICY "Users can insert their own errors" ON public.error_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow ANONYMOUS users to insert (if we want to catch login errors, etc. - risky for spam? Let's limit to authenticated for now or just auth.uid() check)
-- Actually, the error might happen before auth loaded or if auth fails.
-- Usage of service_role in edge functions is safer, but client side we rely on public access if we want truly global logging.
-- For now, let's allow authenticated users.

-- Allow ADMINS to SELECT (view logs)
CREATE POLICY "Admins can view all error logs" ON public.error_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- Allow ADMINS to UPDATE (mark resolved)
CREATE POLICY "Admins can update error logs" ON public.error_logs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );

-- Allow ADMINS to DELETE (cleanup)
CREATE POLICY "Admins can delete error logs" ON public.error_logs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = TRUE
        )
    );
