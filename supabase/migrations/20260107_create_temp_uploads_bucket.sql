-- Create the storage bucket for temporary file uploads (for processing)
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-uploads', 'temp-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the temp-uploads bucket

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own temp files"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'temp-uploads' AND auth.role() = 'authenticated' );

-- Allow users to read their own files (so the Edge Function can act on their behalf if needed, or if we need to verify upload)
CREATE POLICY "Users can view their own temp files"
ON storage.objects FOR SELECT
USING ( bucket_id = 'temp-uploads' AND auth.uid() = owner );

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own temp files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'temp-uploads' AND auth.uid() = owner );

-- Note: The Service Role (used by Edge Functions) bypasses RLS, so it can always read/delete.
