import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, Clock, AlertCircle, User, Building2, MapPin, 
  Calendar, Globe, HelpCircle, Package, FileText, Heart, 
  Settings, Sparkles, Loader2 
} from 'lucide-react';
import { type AgentWizardSession } from '@shared/schema';

interface WizardApprovalProps {
  session: AgentWizardSession;
  onCreateAgent: () => void;
  isCreating: boolean;
}

const CREATION_STEPS = [
  { id: 1, title: 'Agent kaydı kesinleştiriliyor', duration: 2000 },
  { id: 2, title: 'Dosyalar indeksleniyor', duration: 3000 },
  { id: 3, title: 'Sosyal medya içerikleri toplanıyor', duration: 2500 },
  { id: 4, title: 'Prompt derleniyor', duration: 2000 },
  { id: 5, title: 'OpenAI\'de agent konfigüre ediliyor', duration: 4000 },
  { id: 6, title: 'Araç yetkileri test ediliyor', duration: 3000 },
  { id: 7, title: 'Sağlık kontrolü ve test mesajı', duration: 2000 },
  { id: 8, title: 'Yayınlandı!', duration: 1000 }
];

export default function WizardApproval({ session, onCreateAgent, isCreating }: WizardApprovalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isCreating) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    let stepIndex = 0;
    let totalDuration = 0;

    const processSteps = () => {
      if (stepIndex < CREATION_STEPS.length) {
        setCurrentStep(stepIndex + 1);
        
        const step = CREATION_STEPS[stepIndex];
        totalDuration += step.duration;
        
        setTimeout(() => {
          stepIndex++;
          setProgress((stepIndex / CREATION_STEPS.length) * 100);
          processSteps();
        }, step.duration);
      }
    };

    processSteps();
  }, [isCreating]);

  const getSummaryData = () => {
    const requiredFields = [
      { label: 'İşletme Adı', value: session.businessName, required: true },
      { label: 'Sektör', value: session.industry, required: true },
      { label: 'Çalışma Saatleri', value: session.workingHours ? 'Ayarlandı' : null, required: true },
      { label: 'Ürün/Hizmet', value: session.productServiceRaw, required: true },
      { label: 'Çalışan Adı', value: session.employeeName, required: true },
      { label: 'Görev Tanımı', value: session.employeeRole, required: true },
      { label: 'Kişilik', value: session.personality ? 'Ayarlandı' : null, required: true }
    ];

    const optionalFields = [
      { label: 'Adres', value: session.address },
      { label: 'Web Sitesi', value: session.website },
      { label: 'FAQ', value: session.faqRaw },
      { label: 'Eğitim Dosyaları', value: session.trainingFilesCount || 0 > 0 ? `${session.trainingFilesCount} dosya` : null }
    ];

    const socialMedia = session.socialMedia as any || {};
    const connectedSocial = Object.entries(socialMedia).filter(([_, value]) => value).length;

    const selectedTools = session.selectedTools as any || {};
    const enabledTools = Object.entries(selectedTools).filter(([_, value]) => value).length;

    return {
      required: requiredFields,
      optional: optionalFields,
      socialConnections: connectedSocial,
      toolsEnabled: enabledTools,
      completeness: requiredFields.filter(f => f.value).length / requiredFields.length * 100
    };
  };

  const summary = getSummaryData();

  if (isCreating) {
    return (
      <div className="w-full h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-full">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dijital Çalışanınız Oluşturuluyor
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Bu işlem birkaç dakika sürebilir, lütfen bekleyiniz...
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>İlerleme</span>
                <span>%{Math.round(progress)}</span>
              </div>
              <Progress value={progress} className="h-3" />
              
              <div className="space-y-3">
                {CREATION_STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all
                      ${index < currentStep ? 'bg-green-50 dark:bg-green-950' : 
                        index === currentStep - 1 ? 'bg-blue-50 dark:bg-blue-950' : 
                        'bg-gray-50 dark:bg-gray-800'}`}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : index === currentStep - 1 ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={`font-medium ${
                      index < currentStep ? 'text-green-700 dark:text-green-300' :
                      index === currentStep - 1 ? 'text-blue-700 dark:text-blue-300' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-full">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Özet & Onay
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Dijital çalışanınızın özetini inceleyin ve oluşturmayı onaylayın
        </p>
      </div>

      {/* Completeness Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Tamamlanma Oranı
            </h4>
            <Badge 
              variant={summary.completeness === 100 ? "default" : "secondary"}
              className="text-sm"
            >
              %{Math.round(summary.completeness)}
            </Badge>
          </div>
          <Progress value={summary.completeness} className="h-2" />
          {summary.completeness < 100 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              Bazı zorunlu alanlar eksik. Yine de devam edebilirsiniz.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Required Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>Temel Bilgiler</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.required.map((field, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {field.label}
                </span>
                <div className="flex items-center space-x-2">
                  {field.value ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {field.value ? (
                      typeof field.value === 'string' && field.value.length > 20 
                        ? `${field.value.substring(0, 20)}...` 
                        : field.value
                    ) : 'Eksik'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Optional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Ek Bilgiler</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.optional.map((field, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {field.label}
                </span>
                <span className="text-sm">
                  {field.value || 'Yok'}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Sosyal Medya
              </span>
              <span className="text-sm">
                {summary.socialConnections} platform
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Etkin Araçlar
              </span>
              <span className="text-sm">
                {summary.toolsEnabled} araç
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Dijital Çalışan Önizlemesi</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                  {session.employeeName || 'Dijital Çalışan'}
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {session.businessName} - {session.industry}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {session.employeeRole && session.employeeRole.length > 100 
                    ? `${session.employeeRole.substring(0, 100)}...`
                    : session.employeeRole || 'Görev tanımı belirtilmemiş'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={onCreateAgent}
          size="lg"
          className="min-w-48 h-12 text-lg"
          data-testid="button-create-agent"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Dijital Çalışanı Oluştur
        </Button>
      </div>

      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
        <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
          🎉 Harika! Neredeyse tamam
        </h4>
        <p className="text-sm text-green-800 dark:text-green-200">
          Dijital çalışanınız birkaç dakika içinde hazır olacak. Oluşturulduktan sonra
          entegrasyonlar sayfasına yönlendirileceksiniz.
        </p>
      </div>
      </div>
    </div>
  );
}