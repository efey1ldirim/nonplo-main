import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

// Step components
import WizardStep1 from './steps/WizardStep1';
import WizardStep2 from './steps/WizardStep2';
import WizardStep3 from './steps/WizardStep3';
import WizardStep4 from './steps/WizardStep4';
import WizardStep5 from './steps/WizardStep5';
import WizardStep6 from './steps/WizardStep6';
import WizardStep7 from './steps/WizardStep7';
import WizardStep8 from './steps/WizardStep8';
import WizardStep9 from './steps/WizardStep9';
import WizardStep10 from './steps/WizardStep10';
import WizardApproval from './steps/WizardApproval';

import type { 
  AgentWizardSession,
  WizardStep1Data, WizardStep2Data, WizardStep3Data, WizardStep4Data,
  WizardStep5Data, WizardStep6Data, WizardStep7Data, WizardStep8Data,
  WizardStep9Data, WizardStep10Data 
} from '@shared/schema';

interface AgentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (agentId: string) => void;
}

const STEP_TITLES = [
  'İşletme Bilgileri',
  'Adres Bilgisi', 
  'Çalışma Saatleri',
  'Sosyal Medya',
  'Sık Sorulan Sorular',
  'Ürün/Hizmet Bilgileri',
  'Eğitim Dosyaları',
  'Çalışan Bilgileri',
  'Kişilik & Ton',
  'Araçlar',
  'Onay & Oluştur'
];

const REQUIRED_STEPS = [1, 3, 6, 8, 9]; // Required step numbers

export default function AgentWizardModal({ isOpen, onClose, onSuccess }: AgentWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardSessionId, setWizardSessionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch or create wizard session
  const { data: session, isLoading } = useQuery({
    queryKey: ['wizard-session', wizardSessionId],
    queryFn: async () => {
      if (!wizardSessionId) return null;
      const response = await apiRequest(`/api/wizard/sessions/${wizardSessionId}`);
      return response.data as AgentWizardSession;
    },
    enabled: !!wizardSessionId && isOpen,
  });

  // Check authentication and create wizard session when modal opens
  useEffect(() => {
    if (isOpen && !wizardSessionId) {
      checkAuthAndCreateSession();
    }
  }, [isOpen]);

  const checkAuthAndCreateSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        // User is not authenticated, close modal and redirect to auth
        onClose();
        navigate(`/auth?next=${encodeURIComponent('/?openNewWizard=1')}`);
        toast({
          title: "Giriş Gerekli",
          description: "Wizard'ı kullanabilmek için önce giriş yapmanız gerekiyor",
          variant: "destructive"
        });
        return;
      }

      // User is authenticated, create session
      createSession();
    } catch (error) {
      console.error('Auth check failed:', error);
      onClose();
      toast({
        title: "Hata",
        description: "Kimlik doğrulama kontrolü yapılamadı",
        variant: "destructive"
      });
    }
  };

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/wizard/sessions', {
        method: 'POST',
        body: JSON.stringify({ currentStep: 1 }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response;
    },
    onSuccess: (data) => {
      setWizardSessionId(data.data.id);
      setCurrentStep(data.data.currentStep || 1);
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Wizard oturumu oluşturulamadı",
        variant: "destructive"
      });
    }
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (data: Partial<AgentWizardSession>) => {
      if (!wizardSessionId) throw new Error('No session ID');
      
      const response = await apiRequest(`/api/wizard/sessions/${wizardSessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          ...data,
          currentStep: currentStep,
          updatedAt: new Date().toISOString()
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wizard-session', wizardSessionId] });
    }
  });

  const createAgentMutation = useMutation({
    mutationFn: async () => {
      if (!wizardSessionId) throw new Error('No session ID');
      
      const response = await apiRequest(`/api/wizard/sessions/${wizardSessionId}/build`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Başarılı!",
        description: "Dijital çalışanınız başarıyla oluşturuldu",
        variant: "default"
      });
      onSuccess?.(data.data.agentId);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Agent oluşturulamadı",
        variant: "destructive"
      });
    }
  });

  const createSession = () => {
    createSessionMutation.mutate();
  };

  const saveStepData = (data: any) => {
    updateSessionMutation.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < 11) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      if (wizardSessionId) {
        updateSessionMutation.mutate({ currentStep: newStep });
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      if (wizardSessionId) {
        updateSessionMutation.mutate({ currentStep: newStep });
      }
    }
  };

  const handleClose = () => {
    if (isCreating) {
      toast({
        title: "Uyarı",
        description: "Agent oluşturma işlemi devam ediyor, kapatılamaz",
        variant: "destructive"
      });
      return;
    }
    onClose();
  };

  const canProceed = () => {
    if (!session) return false;
    
    // Check required fields for each step
    switch (currentStep) {
      case 1:
        return session.businessName && session.industry;
      case 3:
        return session.workingHours && Object.keys(session.workingHours).length > 0;
      case 6:
        return session.productServiceRaw && session.productServiceRaw.length > 0;
      case 8:
        return session.employeeName && session.employeeRole;
      case 9:
        return session.personality && Object.keys(session.personality).length > 0;
      default:
        return true;
    }
  };

  const getCurrentStepComponent = () => {
    if (!session) return null;

    const commonProps = {
      data: session,
      onSave: saveStepData,
      onNext: nextStep,
      canProceed: canProceed() as boolean
    };

    switch (currentStep) {
      case 1: return <WizardStep1 {...commonProps} />;
      case 2: return <WizardStep2 {...commonProps} />;
      case 3: return <WizardStep3 {...commonProps} />;
      case 4: return <WizardStep4 {...commonProps} />;
      case 5: return <WizardStep5 {...commonProps} />;
      case 6: return <WizardStep6 {...commonProps} />;
      case 7: return <WizardStep7 {...commonProps} sessionId={wizardSessionId} />;
      case 8: return <WizardStep8 {...commonProps} />;
      case 9: return <WizardStep9 {...commonProps} />;
      case 10: return <WizardStep10 {...commonProps} />;
      case 11: return (
        <WizardApproval 
          session={session}
          onCreateAgent={() => {
            setIsCreating(true);
            createAgentMutation.mutate();
          }}
          isCreating={isCreating || createAgentMutation.isPending}
        />
      );
      default: return null;
    }
  };

  const progressPercentage = ((currentStep - 1) / 10) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="
          w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[75vw]
          max-w-6xl
          h-[98vh] sm:h-[95vh] md:h-[90vh] lg:h-[85vh]
          max-h-[800px]
          p-0 
          overflow-hidden
          m-1 sm:m-2 md:m-4
        "
        aria-describedby="wizard-description"
      >
        {/* Dialog Description for accessibility */}
        <div className="sr-only" id="wizard-description">
          Dijital çalışan oluşturmak için 10 adımlık sihirbaz. Her adımda işletmeniz hakkında bilgi verip, sonunda kişiselleştirilmiş AI asistanınızı alacaksınız.
        </div>
        <DialogTitle className="sr-only">
          Dijital Çalışan Oluşturma Sihirbazı - {STEP_TITLES[currentStep - 1]}
        </DialogTitle>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="
            flex items-center justify-between 
            p-3 sm:p-4 lg:p-6 
            border-b 
            bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950
            min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]
          ">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-1 min-w-0">
              <div className="
                w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 
                rounded-full bg-blue-500 
                flex items-center justify-center 
                text-white font-bold 
                text-sm sm:text-base
                flex-shrink-0
              ">
                {currentStep}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="
                  text-base sm:text-lg lg:text-xl xl:text-2xl 
                  font-semibold text-gray-900 dark:text-white
                  truncate
                ">
                  {STEP_TITLES[currentStep - 1]}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Adım {currentStep} / {STEP_TITLES.length}
                  {REQUIRED_STEPS.includes(currentStep) && (
                    <span className="ml-1 sm:ml-2 text-red-500 text-xs">* Zorunlu</span>
                  )}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
              disabled={isCreating}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="
            px-3 sm:px-4 lg:px-6 
            py-2 sm:py-3 lg:py-4 
            bg-gray-50 dark:bg-gray-900
            flex-shrink-0
          ">
            <Progress value={progressPercentage} className="h-1.5 sm:h-2" />
            <div className="flex justify-between mt-1.5 sm:mt-2 text-xs text-gray-500">
              <span className="hidden sm:inline">Başlangıç</span>
              <span className="sm:hidden">%{Math.round(progressPercentage)}</span>
              <span className="hidden sm:inline">%{Math.round(progressPercentage)} Tamamlandı</span>
              <span className="hidden sm:inline">Tamamlandı</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0 overflow-y-auto">
              <div className="p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center min-h-64">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto"></div>
                          <p className="mt-2 text-gray-600 text-sm sm:text-base">Yükleniyor...</p>
                        </div>
                      </div>
                    ) : (
                      getCurrentStepComponent()
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          {currentStep < 11 && (
            <div className="
              flex items-center justify-between 
              p-3 sm:p-4 lg:p-6 
              border-t bg-gray-50 dark:bg-gray-900
              flex-shrink-0
              gap-2 sm:gap-4
            ">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="
                  flex items-center space-x-1 sm:space-x-2
                  px-3 sm:px-4 py-2
                  text-sm sm:text-base
                "
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Önceki</span>
                <span className="sm:hidden">Geri</span>
              </Button>

              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={isCreating}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Çık & Kaydet</span>
                  <span className="sm:hidden">Çık</span>
                </Button>
                
                <Button
                  onClick={nextStep}
                  disabled={!canProceed() || updateSessionMutation.isPending}
                  className="
                    flex items-center space-x-1 sm:space-x-2
                    px-3 sm:px-4 py-2
                    text-sm sm:text-base
                  "
                >
                  <span className="hidden sm:inline">
                    {currentStep === 10 ? 'Onaya Git' : 'Devam Et'}
                  </span>
                  <span className="sm:hidden">
                    {currentStep === 10 ? 'Onay' : 'İleri'}
                  </span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}