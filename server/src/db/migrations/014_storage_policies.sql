-- =============================================================================
-- VibeSocial — Storage Policies Migration
-- =============================================================================

-- 1. Ensure the storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vibesocial-uploads',
  'vibesocial-uploads',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable public read access to uploaded images
CREATE POLICY "Allow public read access to uploads" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'vibesocial-uploads');

-- 3. Allow authenticated users to upload files to their own subdirectory
CREATE POLICY "Allow authenticated upload access" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vibesocial-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Allow authenticated users to update files in their own subdirectory
CREATE POLICY "Allow authenticated update access" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vibesocial-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'vibesocial-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Allow authenticated users to delete files in their own subdirectory
CREATE POLICY "Allow authenticated delete access" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vibesocial-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
