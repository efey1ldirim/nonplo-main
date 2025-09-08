-- Storage policies for support-files bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload support files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'support-files');

-- Allow public read access
CREATE POLICY "Allow public read access to support files" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'support-files');

-- Allow authenticated users to update their files
CREATE POLICY "Allow authenticated users to update support files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'support-files');

-- Allow authenticated users to delete their files
CREATE POLICY "Allow authenticated users to delete support files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'support-files');