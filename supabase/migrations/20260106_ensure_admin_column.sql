-- Ensure is_admin column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create policy to allow admins to see other profiles (needed for User Management)
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
    (select is_admin from public.profiles where id = auth.uid()) = true
);
