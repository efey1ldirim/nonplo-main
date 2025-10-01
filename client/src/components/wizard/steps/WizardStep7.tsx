import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { type AgentWizardSession, type AgentWizardFile } from '@shared/schema';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface WizardStep7Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
  sessionId: string | null;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'uploaded' | 'processing' | 'indexed' | 'error';
  progress?: number;
}

export default function WizardStep7({ data, onSave, onNext, sessionId }: WizardStep7Props) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Fetch existing files from API
  const { data: filesData } = useQuery({
    queryKey: ['/api/wizard/sessions', sessionId, 'files'],
    enabled: !!sessionId,
  });

  // Load files from API into local state
  useEffect(() => {
    if (filesData?.data && Array.isArray(filesData.data)) {
      const files: UploadedFile[] = (filesData.data as AgentWizardFile[])
        .filter((file) => file && file.id && file.originalName && typeof file.fileSize === 'number')
        .map((file) => ({
          id: file.id,
          name: file.originalName,
          size: file.fileSize,
          status: (file.status as UploadedFile['status']) || 'uploaded',
        }));
      setUploadedFiles(files);
    } else {
      setUploadedFiles([]);
    }
  }, [filesData]);

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ fileName, fileSize }: { fileName: string; fileSize: number }) => {
      if (!sessionId) throw new Error('No session ID');
      return apiRequest(`/api/wizard/sessions/${sessionId}/files`, {
        method: 'POST',
        body: { fileName, fileSize }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wizard/sessions', sessionId, 'files'] });
    },
  });

  // Update file status mutation
  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, status }: { fileId: string; status: string }) => {
      if (!sessionId) throw new Error('No session ID');
      return apiRequest(`/api/wizard/sessions/${sessionId}/files/${fileId}`, {
        method: 'PATCH',
        body: { status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wizard/sessions', sessionId, 'files'] });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      if (!sessionId) throw new Error('No session ID');
      return apiRequest(`/api/wizard/sessions/${sessionId}/files/${fileId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wizard/sessions', sessionId, 'files'] });
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        // Create file record in database
        const response = await uploadFileMutation.mutateAsync({
          fileName: file.name,
          fileSize: file.size,
        });

        const fileId = response.data.id;

        // Simulate upload progress with status updates
        setTimeout(async () => {
          await updateFileMutation.mutateAsync({ fileId, status: 'uploaded' });
        }, 1000);

        setTimeout(async () => {
          await updateFileMutation.mutateAsync({ fileId, status: 'processing' });
        }, 2000);

        setTimeout(async () => {
          await updateFileMutation.mutateAsync({ fileId, status: 'indexed' });
        }, 4000);
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
  }, [sessionId, uploadFileMutation, updateFileMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/markdown': ['.md']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeFile = async (fileId: string) => {
    try {
      await deleteFileMutation.mutateAsync(fileId);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>;
      case 'uploaded':
      case 'indexed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading': return 'Yükleniyor...';
      case 'uploaded': return 'Yüklendi';
      case 'processing': return 'İşleniyor...';
      case 'indexed': return 'Hazır';
      case 'error': return 'Hata';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = () => {
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto">
          <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Eğitim Dosyaları
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Dijital çalışanınızı geliştirmek için ek dosyalar yükleyin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Dosya Yükleme</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            data-testid="file-upload-dropzone"
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-blue-600 dark:text-blue-400">
                Dosyaları buraya bırakın...
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600 dark:text-gray-300">
                  Dosyalarınızı sürükleyip bırakın veya tıklayın
                </p>
                <p className="text-sm text-gray-500">
                  PDF, Word, TXT, CSV, Excel, Markdown formatları desteklenir (Max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Yüklenen Dosyalar ({uploadedFiles.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                    data-testid={`uploaded-file-${file.id}`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(file.status)}
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {getStatusText(file.status)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-red-500 hover:text-red-700"
                        data-testid={`remove-file-${file.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              📋 Önerilen Dosyalar
            </h4>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• Menü veya katalog dosyaları</li>
              <li>• Çalışan el kitabı</li>
              <li>• İletişim kuralları</li>
              <li>• Ürün/hizmet detay dökümanları</li>
              <li>• Fiyat listeleri</li>
            </ul>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
