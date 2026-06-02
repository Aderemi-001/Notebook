-- Focus Timer Sessions Log
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type      text NOT NULL CHECK (session_type IN ('focus', 'short_break', 'long_break')),
  duration_minutes  integer NOT NULL,
  completed_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for queries (e.g. daily/weekly stats for a user)
CREATE INDEX IF NOT EXISTS focus_sessions_user_id_completed_at_idx ON public.focus_sessions(user_id, completed_at DESC);

-- RLS
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own sessions
CREATE POLICY "Users can insert own focus sessions"
  ON public.focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own sessions
CREATE POLICY "Users can read own focus sessions"
  ON public.focus_sessions FOR SELECT
  USING (auth.uid() = user_id);
