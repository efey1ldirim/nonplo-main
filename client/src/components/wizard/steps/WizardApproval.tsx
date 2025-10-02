import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, Clock, AlertCircle, User, Building2, MapPin, 
  Calendar, Globe, HelpCircle, Package, FileText, Heart, 
  Settings, Sparkles, Loader2, Mail, Search, FileSearch, CreditCard 
} from 'lucide-react';
import { type AgentWizardSession } from '@shared/schema';

const TOOLS_CONFIG = [
  { key: 'googleCalendar', name: 'Google Takvim', icon: Calendar, color: 'text-blue-500' },
  { key: 'gmail', name: 'Gmail', icon: Mail, color: 'text-red-500' },
  { key: 'webSearch', name: 'Web Arama', icon: Search, color: 'text-green-500' },
  { key: 'fileSearch', name: 'Dosya Arama', icon: FileSearch, color: 'text-purple-500' },
  { key: 'productCatalog', name: 'Ürün Kataloğu', icon: Package, color: 'text-orange-500' },
  { key: 'paymentLinks', name: 'Ödeme Linkleri', icon: CreditCard, color: 'text-indigo-500' },
  { key: 'humanHandoff', name: 'İnsan Devresi', icon: User, color: 'text-gray-500' }
];

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
    const currentStepText = currentStep > 0 && currentStep <= CREATION_STEPS.length 
      ? CREATION_STEPS[currentStep - 1].title 
      : 'Başlatılıyor...';

    return (
      <div className="max-w-2xl mx-auto space-y-6">
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

        <div className="space-y-3 py-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>İlerleme</span>
            <span>%{Math.round(progress)}</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {currentStepText}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 rounded-3xl -m-8" />
        <div className="relative z-10 space-y-4 p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-3">
            <h3 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 dark:from-white dark:via-purple-100 dark:to-blue-100 bg-clip-text text-transparent">
              Dijital Çalışanınız Hazır!
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Son kontrolü yapın ve hayalinizdeki AI asistanını hayata geçirin
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column - Agent Preview (Takes 2 columns on XL) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Digital Employee Hero Card */}
          <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/30 dark:to-purple-950/30">
            <div className="relative">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.1),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]" />
              
              <CardContent className="relative z-10 p-8">
                <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                  
                  {/* Avatar Section */}
                  <div className="flex-shrink-0">
                    <div className="relative w-32 h-32">
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all duration-300">
                        <User className="w-16 h-16 text-white" />
                      </div>
                      {/* Status Indicator */}
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Employee Info */}
                  <div className="flex-1 text-center lg:text-left space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                        {session.employeeName || 'Dijital Çalışan'}
                      </h4>
                      <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-2 lg:space-y-0">
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 text-base px-4 py-2 w-fit">
                          {session.businessName || 'İşletme'}
                        </Badge>
                        <span className="text-lg text-gray-600 dark:text-gray-300">
                          {session.industry || 'Sektör belirtilmemiş'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 space-y-3">
                      <div className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Görev Tanımı</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {session.employeeRole && session.employeeRole.length > 200 
                          ? `${session.employeeRole.substring(0, 200)}...`
                          : session.employeeRole || 'Görev tanımı henüz belirlenmemiş'
                        }
                      </p>
                    </div>

                    {/* Active Tools Row */}
                    <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg p-4">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 text-center">Etkin Araçlar</div>
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        {(() => {
                          const selectedTools = (session.selectedTools as any) || {};
                          const activeTools = TOOLS_CONFIG.filter(tool => selectedTools[tool.key]);
                          
                          if (activeTools.length === 0) {
                            return (
                              <span className="text-xs text-gray-500 dark:text-gray-400">Araç seçilmemiş</span>
                            );
                          }
                          
                          return activeTools.map((tool) => {
                            const Icon = tool.icon;
                            return (
                              <div 
                                key={tool.key}
                                className="flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                                title={tool.name}
                              >
                                <Icon className={`w-5 h-5 ${tool.color}`} />
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Essential Information */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-900 to-purple-900 dark:from-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                    Temel Bilgiler
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary.required.map((field, index) => (
                  <div key={index} className="group p-3 rounded-lg hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={field.value || 'Eksik'}>
                          {field.value ? (
                            typeof field.value === 'string' && field.value.length > 25 
                              ? `${field.value.substring(0, 25)}...` 
                              : field.value
                          ) : 'Eksik'}
                        </span>
                        {field.value ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-900 dark:to-purple-950/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-900 to-pink-900 dark:from-purple-100 dark:to-pink-100 bg-clip-text text-transparent">
                    Ek Bilgiler
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary.optional.map((field, index) => (
                  <div key={index} className="group p-3 rounded-lg hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={field.value || 'Belirtilmemiş'}>
                        {field.value || 'Belirtilmemiş'}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Progress & Action */}
        <div className="space-y-6">
          
          {/* Completion Status */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50/50 dark:from-gray-900 dark:to-green-950/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-32 h-32 mx-auto">
                    {/* Progress Circle */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - summary.completeness / 100)}`}
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {Math.round(summary.completeness)}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Hazır
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    {summary.completeness === 100 ? 'Mükemmel!' : 'Neredeyse Hazır!'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {summary.completeness === 100 
                      ? 'Tüm bilgiler tamamlandı. Dijital çalışanınız oluşturulmaya hazır!'
                      : `${7 - summary.required.filter(f => f.value).length} zorunlu alan eksik, ancak yine de devam edebilirsiniz.`
                    }
                  </p>
                </div>

                {summary.completeness < 100 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Eksik alanlar var</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_70%)]" />
            <CardContent className="relative z-10 p-8 text-center space-y-6">
              <Sparkles className="w-12 h-12 mx-auto" />
              <div className="space-y-3">
                <h4 className="text-xl font-bold">
                  Son Adım!
                </h4>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Dijital çalışanınızı oluşturmak için hazırsınız. Bu işlem 1-2 dakika sürebilir.
                </p>
              </div>
              <Button
                onClick={onCreateAgent}
                size="lg"
                className="w-full h-14 text-lg font-semibold bg-white text-blue-600 hover:bg-gray-50 border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                data-testid="button-create-agent"
              >
                <Sparkles className="w-6 h-6 mr-3" />
                Dijital Çalışanı Oluştur
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}