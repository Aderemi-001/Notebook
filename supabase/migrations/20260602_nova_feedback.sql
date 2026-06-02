-- Nova chatbot feedback persistence
CREATE TABLE IF NOT EXISTS public.nova_feedback (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id  text NOT NULL,
  feedback    text NOT NULL CHECK (feedback IN ('up', 'down')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS nova_feedback_user_id_idx ON public.nova_feedback(user_id);
CREATE INDEX IF NOT EXISTS nova_feedback_created_at_idx ON public.nova_feedback(created_at DESC);

-- RLS
ALTER TABLE public.nova_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.nova_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON public.nova_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "Admins can read all feedback"
  ON public.nova_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
