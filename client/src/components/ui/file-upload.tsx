import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSupabaseStorage, type StorageBucket } from '@/hooks/useSupabaseStorage';

interface FileUploadProps {
  bucket: StorageBucket;
  onUploadComplete?: (result: { url: string; path: string }) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
  completed?: boolean;
  result?: { url: string; path: string };
}

export const FileUpload = ({
  bucket,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  accept,
  disabled = false,
  className = ''
}: FileUploadProps) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { uploadFile } = useSupabaseStorage();

  const handleUpload = async (file: File) => {
    // Add file to uploading list
    const uploadingFile: UploadingFile = { file, progress: 0 };
    setUploadingFiles(prev => [...prev, uploadingFile]);

    try {
      const result = await uploadFile({
        bucket,
        filePath: `${Date.now()}-${file.name}`,
        file,
        onProgress: (progress) => {
          setUploadingFiles(prev =>
            prev.map(f => f.file === file ? { ...f, progress } : f)
          );
        }
      });

      if (result) {
        // Mark as completed
        setUploadingFiles(prev =>
          prev.map(f => f.file === file ? { ...f, completed: true, result } : f)
        );
        onUploadComplete?.(result);
        
        // Remove from list after 2 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.file !== file));
        }, 2000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadingFiles(prev =>
        prev.map(f => f.file === file ? { ...f, error: errorMessage } : f)
      );
      onUploadError?.(errorMessage);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(handleUpload);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled: disabled || uploadingFiles.length >= maxFiles
  });

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-primary">Drop files here...</p>
        ) : (
          <div>
            <p className="text-lg font-medium mb-2">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Maximum {maxFiles} files, up to 10MB each
            </p>
          </div>
        )}
      </div>

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={`${uploadingFile.file.name}-${index}`}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              <div className="flex-shrink-0">
                {getFileIcon(uploadingFile.file)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">
                    {uploadingFile.file.name}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(uploadingFile.file.size)}
                  </Badge>
                </div>
                
                {uploadingFile.error ? (
                  <p className="text-xs text-destructive">{uploadingFile.error}</p>
                ) : uploadingFile.completed ? (
                  <p className="text-xs text-green-600">Upload completed!</p>
                ) : (
                  <div className="space-y-1">
                    <Progress value={uploadingFile.progress} className="h-1" />
                    <p className="text-xs text-muted-foreground">
                      {uploadingFile.progress}% uploaded
                    </p>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeUploadingFile(uploadingFile.file)}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};