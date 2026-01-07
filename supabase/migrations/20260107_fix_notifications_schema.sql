-- Fix Notifications Table Schema
-- 1. Add 'type' column used by RPCs
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info';

-- 2. Make 'title' nullable since RPCs don't provide it
ALTER TABLE public.notifications ALTER COLUMN title DROP NOT NULL;
