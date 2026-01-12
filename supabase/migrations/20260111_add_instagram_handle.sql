-- Add instagram_handle column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
