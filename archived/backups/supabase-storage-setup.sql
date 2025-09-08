-- Supabase Storage Setup
-- Create storage buckets and policies for file uploads

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('attachments', 'attachments', true), 
  ('documents', 'documents', false),
  ('agent-media', 'agent-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Users can view all avatar files" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar files" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar files" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar files" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for attachments bucket  
CREATE POLICY "Users can view their own attachment files" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload attachment files" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own attachment files" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for documents bucket (private)
CREATE POLICY "Users can view their own document files" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload document files" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own document files" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for agent-media bucket
CREATE POLICY "Users can view their own agent media files" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'agent-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload agent media files" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'agent-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own agent media files" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'agent-media' AND auth.uid()::text = (storage.foldername(name))[1]);