-- Enable RLS on study_sets
ALTER TABLE public.study_sets ENABLE ROW LEVEL SECURITY;

-- 1. VIEW Policy
-- Public sets are viewable by everyone
-- Private sets are viewable by Owner or Admin
CREATE POLICY "Public sets are viewable by everyone" 
ON public.study_sets FOR SELECT 
USING (
  is_public = true 
  OR 
  auth.uid() = user_id
  OR 
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- 2. INSERT Policy
-- Authenticated users can create sets
CREATE POLICY "Users can create study sets" 
ON public.study_sets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE Policy
-- Owner or Admin can update
CREATE POLICY "Owners and Admins can update study sets" 
ON public.study_sets FOR UPDATE 
USING (
  auth.uid() = user_id
  OR 
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- 4. DELETE Policy
-- Owner or Admin can delete
CREATE POLICY "Owners and Admins can delete study sets" 
ON public.study_sets FOR DELETE 
USING (
  auth.uid() = user_id
  OR 
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);
