import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export type StorageBucket = 'avatars' | 'attachments' | 'documents' | 'agent-media';

interface UploadOptions {
  bucket: StorageBucket;
  filePath: string;
  file: File;
  onProgress?: (progress: number) => void;
}

interface UseSupabaseStorageReturn {
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadFile: (options: UploadOptions) => Promise<{ url: string; path: string } | null>;
  deleteFile: (bucket: StorageBucket, filePath: string) => Promise<boolean>;
  getPublicUrl: (bucket: StorageBucket, filePath: string) => string;
}

export const useSupabaseStorage = (): UseSupabaseStorageReturn => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async ({ bucket, filePath, file, onProgress }: UploadOptions) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Validate file type based on bucket
      const allowedTypes = {
        avatars: ['image/jpeg', 'image/png', 'image/webp'],
        attachments: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
        documents: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'agent-media': ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      };

      if (!allowedTypes[bucket].includes(file.type)) {
        throw new Error(`File type ${file.type} not allowed for ${bucket} bucket`);
      }

      // Create a unique file path if not provided
      const timestamp = Date.now();
      const uniqueFilePath = filePath || `${timestamp}-${file.name}`;

      // Upload file with progress tracking
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(uniqueFilePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);
      onProgress?.(100);

      return {
        url: publicUrl,
        path: data.path
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (bucket: StorageBucket, filePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Delete failed');
      return false;
    }
  };

  const getPublicUrl = (bucket: StorageBucket, filePath: string): string => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };

  return {
    uploading,
    progress,
    error,
    uploadFile,
    deleteFile,
    getPublicUrl
  };
};