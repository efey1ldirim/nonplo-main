import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { type AgentWizardSession } from '@shared/schema';

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const fileId = Math.random().toString(36).substr(2, 9);
      const uploadFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        status: 'uploading'
      };

      setUploadedFiles(prev => [...prev, uploadFile]);

      // Simulate file upload
      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'uploaded' } : f
        ));
      }, 1000);

      // Simulate processing
      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'processing' } : f
        ));
      }, 2000);

      // Simulate indexing complete
      setTimeout(() => {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'indexed' } : f
        ));
      }, 4000);
    });

    // Update session data
    onSave({
      trainingFilesCount: data.trainingFilesCount || 0 + acceptedFiles.length,
      filesIndexStatus: 'processing'
    });
  }, [data.trainingFilesCount, onSave]);

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

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
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

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          className="min-w-32"
          data-testid="button-next-step7"
        >
          Devam Et
        </Button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 İpucu</h4>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Yüklediğiniz dosyalar analiz edilerek dijital çalışanınızın bilgi bankasına eklenir. 
          Bu adım isteğe bağlıdır ancak daha detaylı yanıtlar için önerilir.
        </p>
      </div>
    </div>
  );
}