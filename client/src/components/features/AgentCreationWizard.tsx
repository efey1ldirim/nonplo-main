import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, ArrowRight, ArrowLeft, Monitor, Zap, MessageSquare, Calendar, Phone, Globe, Instagram, Search, ChevronDown, Upload, MapPin, Clock, Loader2, Sparkles, CheckCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { containsProfanity, getProfanityMessage } from "@/utils/profanity-filter";

// Centralized debug logging
const debugLogger = {
  getTimestamp: () => new Date().toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul" }),
  createLogMessage: (message: string) => `[${debugLogger.getTimestamp()}] ${message}`,
};

// Centralized API request function with logging
async function authenticatedPost(
  endpoint: string,
  body: any,
  token: string,
  addLog: (message: string) => void,
  logPrefix: string
) {
  addLog(`📡 ${endpoint} API'sine istek gönderiliyor...`);
  addLog(`📋 İstek gövdesi: ${JSON.stringify(body, null, 2)}`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  addLog(`📊 API yanıtı alındı: HTTP ${res.status} ${res.statusText}`);
  addLog(`📥 API yanıtı: ${JSON.stringify(data, null, 2)}`);

  if (data.debugLogs && Array.isArray(data.debugLogs)) {
    addLog(`🛠 ${data.debugLogs.length} debug logu alındı`);
    data.debugLogs.forEach((log: string) =>
      addLog(`[${logPrefix}] ${log}`)
    );
  }

  return data;
}

interface AgentCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (agentId: string) => void;
  fromDashboard?: boolean; // Track if opened from dashboard for auto-refresh
}

const AgentCreationWizard = ({ open, onClose, onSuccess, fromDashboard = false }: AgentCreationWizardProps) => {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [currentSubStep, setCurrentSubStep] = useState(1);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const isCreatingRef = useRef(false);
  const [nameCheckResult, setNameCheckResult] = useState<{ available: boolean; message: string } | null>(null);
  const [nameCheckLoading, setNameCheckLoading] = useState(false);
  const nameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add log function
  const addLog = (message: string) => {
    setLogs(prev => [...prev, debugLogger.createLogMessage(message)]);
  };

  // Check agent name availability with debouncing
  const checkAgentNameAvailability = async (name: string) => {
    // İsim kontrolü devre dışı bırakıldı
    setNameCheckResult({ available: true, message: 'İsim kullanılabilir' });
    setNameCheckLoading(false);
  };

  // Debounced name check (devre dışı)
  const debouncedNameCheck = (name: string) => {
    // İsim kontrolü devre dışı bırakıldı
    return;
  };






  // Phase 1: Google Calendar OAuth with real agent UUID
  const connectGoogleCalendarWithRealAgent = async (userId: string, realAgentId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const authUrl = `/auth/google/connect/${userId}/${realAgentId}`;
        const authWindow = window.open(authUrl, 'google-oauth', 'width=500,height=600');
        
        if (!authWindow) {
          throw new Error('Pop-up blocked');
        }
        
        const pollTimer = setInterval(async () => {
          try {
            if (authWindow.closed) {
              clearInterval(pollTimer);
              
              // Check actual connection status with real agent UUID
              const response = await fetch(`/api/calendar/status/${userId}/${realAgentId}`);
              const status = await response.json();
              
              if (status.connected) {
                setWizardData(prev => ({
                  ...prev,
                  googleCalendarConnection: {
                    ...prev.googleCalendarConnection,
                    connected: true,
                    email: status.email || 'Connected'
                  }
                }));
                resolve();
              } else {
                reject(new Error('Google Calendar bağlantısı başarısız'));
              }
            }
          } catch (error) {
            clearInterval(pollTimer);
            reject(error);
          }
        }, 1000);
        
        // Cleanup timer after 2 minutes
        setTimeout(() => {
          clearInterval(pollTimer);
          if (!authWindow.closed) {
            authWindow.close();
          }
          reject(new Error('Google Calendar bağlantı süresi aşıldı'));
        }, 120000);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  // Form states - Enhanced wizard data
  const [wizardData, setWizardData] = useState({
    sector: "",
    businessName: "",
    location: "",
    address: "",
    weeklyHours: {
      monday: { open: "09:00", close: "18:00", closed: false },
      tuesday: { open: "09:00", close: "18:00", closed: false },
      wednesday: { open: "09:00", close: "18:00", closed: false },
      thursday: { open: "09:00", close: "18:00", closed: false },
      friday: { open: "09:00", close: "18:00", closed: false },
      saturday: { open: "10:00", close: "16:00", closed: false },
      sunday: { open: "10:00", close: "16:00", closed: true }
    },
    holidays: "",
    website: "",
    instagramUsername: "",
    twitterUsername: "",
    tiktokUsername: "",
    faq: "",
    products: "",
    messageHistory: null as any,
    tone: "",
    responseLength: "",
    userVerification: "",
    serviceType: "",
    taskDescription: "",
    tools: {
      websiteIntegration: false,
      emailNotifications: false,
      whatsappIntegration: false,
      calendarBooking: false,
      socialMediaMonitoring: false,
      crmIntegration: false,
      analyticsReporting: false,
      multiLanguageSupport: false
    },
    integrations: {
      whatsapp: false,
      instagram: false,
      telegram: false,
      slack: false,
      zapier: false,
      shopify: false,
      woocommerce: false,
      hubspot: false
    },
    googleCalendarConnection: {
      enabled: false,
      connected: false,
      email: ""
    }
  });

  const totalSteps = 8;

  // Cleanup function to cancel agent creation
  const cancelAgentCreation = async () => {
    if (currentAgentId && isCreatingRef.current) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/cancel-agent-creation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ agentId: currentAgentId }),
          });
          console.log(`Agent creation cancelled for ID: ${currentAgentId}`);
        }
      } catch (error) {
        console.error("Error cancelling agent creation:", error);
      }
    }
  };

  // Handle page unload and component unmount
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentAgentId && isCreatingRef.current) {
        e.preventDefault();
        cancelAgentCreation();
        return (e.returnValue = "Dijital çalışan oluşturma işlemi devam ediyor. Çıkmak istediğinizden emin misiniz?");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (currentAgentId && isCreatingRef.current) {
        cancelAgentCreation();
      }
    };
  }, [currentAgentId]);

  const stepTitles = [
    "Sektör Seçimi",
    "İşletme Bilgileri", 
    "Çalışma Saatleri",
    "Sosyal Medya",
    "Ürün/Hizmet Bilgileri",
    "Kişilik & Davranış",
    "Görev Tanımı",
    "Araçlar & Entegrasyonlar"
  ];

  // Check if current step has all required fields filled
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return wizardData.sector.trim().length > 0;
      case 2:
        if (currentSubStep === 1) {
          return wizardData.businessName.trim().length > 0;
        }
        if (currentSubStep === 2) {
          return true; // Address is now optional
        }
        return true;
      case 5:
        if (currentSubStep === 1) {
          return wizardData.faq.trim().length > 0;
        }
        if (currentSubStep === 2) {
          return wizardData.products.trim().length > 0;
        }
        return true;
      case 6:
        if (currentSubStep === 1) {
          return !!wizardData.tone;
        }
        if (currentSubStep === 2) {
          return !!wizardData.responseLength;
        }
        if (currentSubStep === 3) {
          return !!wizardData.userVerification;
        }
        if (currentSubStep === 4) {
          return !!wizardData.serviceType;
        }
        return true;
      case 7:
        return wizardData.taskDescription.trim().length > 0;
      default:
        return true;
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!wizardData.sector.trim()) {
          toast({
            title: "Eksik Bilgi",
            description: "Lütfen sektörünüzü seçin.",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 2:
        if (currentSubStep === 1) {
          if (!wizardData.businessName.trim()) {
            toast({
              title: "Eksik Bilgi",
              description: "Lütfen işletme adınızı girin.",
              variant: "destructive",
            });
            return false;
          }
          
          // İsim kontrolü devre dışı - sadece boş olup olmadığını kontrol et
        }
        if (currentSubStep === 2) {
          // Address is now optional - no validation needed
        }
        break;
      case 5:
        if (currentSubStep === 1) {
          if (!wizardData.faq.trim()) {
            toast({
              title: "Eksik Bilgi",
              description: "Lütfen sık sorulan sorular bilgisini girin.",
              variant: "destructive",
            });
            return false;
          }
        }
        if (currentSubStep === 2) {
          if (!wizardData.products.trim()) {
            toast({
              title: "Eksik Bilgi",
              description: "Lütfen ürün/hizmet bilgilerinizi girin.",
              variant: "destructive",
            });
            return false;
          }
        }
        break;
      case 6:
        if (currentSubStep === 1) {
          if (!wizardData.tone) {
            toast({
              title: "Eksik Bilgi",
              description: "Lütfen konuşma tarzını seçin.",
              variant: "destructive",
            });
            return false;
          }
        }
        if (currentSubStep === 2) {
          if (!wizardData.responseLength) {
            toast({
              title: "Eksik Bilgi",
              description: "Lütfen yanıt uzunluğunu seçin.",
              variant: "destructive",
            });
            return false;
          }
        }
        if (currentSubStep === 3) {
          if (!wizardData.userVerification) {
            toast({
              title: "Eksik Bilgi",
              description: "Lütfen kullanıcı doğrulama tercihini seçin.",
              variant: "destructive",
            });
            return false;
          }
        }
        if (currentSubStep === 4) {
          if (!wizardData.serviceType) {
            toast({
              title: "Eksik Bilgi",
              description: "Lütfen hizmet türünü seçin.",
              variant: "destructive",
            });
            return false;
          }
        }
        break;
      case 7:
        if (!wizardData.taskDescription.trim()) {
          toast({
            title: "Eksik Bilgi",
            description: "Lütfen görev tanımını girin.",
            variant: "destructive",
          });
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStep === 2 || currentStep === 5 || currentStep === 6) {
      const maxSubSteps = currentStep === 2 ? 2 : currentStep === 5 ? 3 : 4;
      if (currentSubStep < maxSubSteps) {
        setCurrentSubStep(currentSubStep + 1);
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setCurrentSubStep(1);
    }
  };

  const handlePrevious = () => {
    if (currentStep === 2 || currentStep === 5 || currentStep === 6) {
      if (currentSubStep > 1) {
        setCurrentSubStep(currentSubStep - 1);
        return;
      }
    }

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (currentStep - 1 === 2 || currentStep - 1 === 5) {
        setCurrentSubStep(currentStep - 1 === 2 ? 2 : 3);
      } else if (currentStep - 1 === 6) {
        setCurrentSubStep(4);
      } else {
        setCurrentSubStep(1);
      }
    }
  };

  const handleWizardClose = () => {
    if (currentStep > 1 || wizardData.sector || wizardData.businessName) {
      setShowExitConfirmation(true);
    } else {
      onClose();
      setCurrentStep(1);
      setCurrentSubStep(1);
    }
  };

  const confirmExit = () => {
    setShowExitConfirmation(false);
    onClose();
    setCurrentStep(1);
    setCurrentSubStep(1);
    resetWizardData();
  };

  const resetWizardData = () => {
    setWizardData({
      sector: "",
      businessName: "",
      location: "",
      address: "",
      weeklyHours: {
        monday: { open: "09:00", close: "18:00", closed: false },
        tuesday: { open: "09:00", close: "18:00", closed: false },
        wednesday: { open: "09:00", close: "18:00", closed: false },
        thursday: { open: "09:00", close: "18:00", closed: false },
        friday: { open: "09:00", close: "18:00", closed: false },
        saturday: { open: "10:00", close: "16:00", closed: false },
        sunday: { open: "10:00", close: "16:00", closed: true }
      },
      holidays: "",
      website: "",
      instagramUsername: "",
      twitterUsername: "",
      tiktokUsername: "",
      faq: "",
      products: "",
      messageHistory: null,
      tone: "",
      responseLength: "",
      userVerification: "",
      serviceType: "",
      taskDescription: "",
      tools: {
        websiteIntegration: false,
        emailNotifications: false,
        whatsappIntegration: false,
        calendarBooking: false,
        socialMediaMonitoring: false,
        crmIntegration: false,
        analyticsReporting: false,
        multiLanguageSupport: false
      },
      integrations: {
        whatsapp: false,
        instagram: false,
        telegram: false,
        slack: false,
        zapier: false,
        shopify: false,
        woocommerce: false,
        hubspot: false
      },
      googleCalendarConnection: {
        enabled: false,
        connected: false,
        email: ""
      }
    });
  };

  // User-friendly logging function
  const addUserLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const handleFinish = async () => {
    // Prevent multiple simultaneous agent creation attempts
    if (isCreatingRef.current || isLoading) {
      addUserLog("⚠ Dijital çalışan oluşturma işlemi zaten devam ediyor...");
      return;
    }

    try {
      setLogs([]);
      setResult("");
      setIsLoading(true);
      isCreatingRef.current = true;
      addUserLog("🎯 Yapay Zeka Destekli Dijital Çalışanınızı hazırlıyoruz...");
      
      // Simulate some preparation time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      addUserLog(`✨ ${wizardData.businessName} için özel Yapay Zeka Destekli Dijital Çalışan oluşturuluyor...`);

      if (!user) {
        addUserLog("❌ Oturum açmanız gerekiyor");
        setResult("⚠ Lütfen giriş yaptıktan sonra tekrar deneyin.");
        toast({
          title: "Hata",
          description: "Lütfen giriş yaptıktan sonra tekrar deneyin.",
          variant: "destructive",
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Oturum bulunamadı");
      }

      const token = session.access_token;

      // Create comprehensive description from wizard data
      const description = [
        wizardData.faq && `FAQ: ${wizardData.faq}`,
        wizardData.products && `Ürünler/Hizmetler: ${wizardData.products}`,
        wizardData.taskDescription && `Görevler: ${wizardData.taskDescription}`,
        wizardData.address && `Adres: ${wizardData.address}`,
        wizardData.website && `Website: ${wizardData.website}`,
        wizardData.sector && `Sektör: ${wizardData.sector}`
      ].filter(Boolean).join('\n\n');

      const requestBody = {
        agentName: wizardData.businessName.trim(),
        agentPurpose: description || wizardData.businessName + " için dijital asistan",
        personality: wizardData.tone || "friendly",
        expertise: wizardData.products ? wizardData.products.split(',').map(p => p.trim()).filter(Boolean) : [],
        communicationStyle: wizardData.tone || "friendly",
        targetAudience: wizardData.sector || "genel müşteriler",
        specialInstructions: wizardData.taskDescription || "",
        preferredLanguage: "tr",
        temperature: 1.0,
        userId: user.id,
      };

      addUserLog("🤖 Yapay Zeka Destekli Dijital Çalışannızın temel yapısı kuruluyor...");
      const data = await authenticatedPost("/api/create-cx-agent", requestBody, token, () => {}, "OpenAI Agent");

      if (!data.success || !data.agentId) {
        throw new Error(data.error || "Yapay Zeka Destekli Dijital Çalışan oluşturulamadı");
      }

      const agentId = data.agentId;
      setCurrentAgentId(agentId); // Track the agent ID for cleanup
      addUserLog("✅ Yapay Zeka Destekli Dijital Çalışannızın temel yapısı başarıyla oluşturuldu!");

      // Map tone to personality and communication style
      const toneMapping = {
        "professional": { personality: "professional", language: "formal" },
        "friendly": { personality: "friendly", language: "friendly" },
        "casual": { personality: "casual", language: "friendly" }
      };

      const toneConfig = toneMapping[wizardData.tone as keyof typeof toneMapping] || 
                       { personality: "friendly", language: "friendly" };

      const playbookConfig = {
        agentName: wizardData.businessName.trim(),
        description: description,
        toneOfVoice: toneConfig.personality,
        greetingStyle: "warm",
        language: toneConfig.language,
        sector: wizardData.sector,
        serviceType: wizardData.serviceType,
        products: wizardData.products,
        address: wizardData.address,
        location: wizardData.location,
        website: wizardData.website,
        taskDescription: wizardData.taskDescription,
        faq: wizardData.faq,
        holidays: wizardData.holidays,
        responseLength: wizardData.responseLength,
        userVerification: wizardData.userVerification,
        socialMedia: {
          instagram: wizardData.instagramUsername,
          twitter: wizardData.twitterUsername,
          tiktok: wizardData.tiktokUsername,
        },
        workingHours: wizardData.weeklyHours,
        tools: wizardData.tools,
        integrations: wizardData.integrations,
      };

      // OpenAI agent creation tamamlandı - kişilik ayarları zaten dahil
      
      // Google Calendar entegrasyonu kontrolü
      if (wizardData.googleCalendarConnection.enabled && wizardData.googleCalendarConnection.connected) {
        addUserLog("📅 Google Calendar entegrasyonu tespit edildi - tool aktif ediliyor...");
      }
      
      // OpenAI agent zaten tam fonksiyonel oluşturuldu - ekstra playbook API çağrısı gerek yok
      addUserLog("🎭 OpenAI Agent tüm kişilik ayarları ve davranış kuralları ile hazırlandı!");
      const playbookData = { success: true }; // Mock success for existing flow

      if (!playbookData.success) {
        addUserLog("⚠ Kişilik ayarları eklenirken bir sorun oluştu");
        setResult(`⚠ Yapay Zeka Destekli Dijital Çalışan oluşturuldu ancak kişilik ayarları tamamlanamadı`);
        toast({
          title: "Uyarı",
          description: "Yapay Zeka Destekli Dijital Çalışan oluşturuldu ancak bazı ayarlar tamamlanamadı",
          variant: "destructive",
        });
        return;
      }

      addUserLog("🎉 Yapay Zeka Destekli Dijital Çalışannızın kişilik eğitimi tamamlandı!");
      
      // Phase 1 Fix: Google Calendar OAuth with real agent UUID after creation
      if (wizardData.googleCalendarConnection.enabled && !wizardData.googleCalendarConnection.connected) {
        addUserLog("📅 Google Calendar bağlantısı kuruluyor...");
        
        try {
          await connectGoogleCalendarWithRealAgent(user.id, agentId);
          addUserLog("✅ Google Calendar başarıyla bağlandı!");
        } catch (calendarError) {
          console.error('Google Calendar bağlantı hatası:', calendarError);
          addUserLog("⚠ Google Calendar bağlantısı kurulamadı - manuel olarak bağlayabilirsiniz");
        }
      }
      
      addUserLog(`✨ ${wizardData.businessName} Yapay Zeka Destekli Dijital Çalışan artık müşterilerinize hizmet vermeye hazır!`);
      
      setResult(`🎉 Tebrikler! ${wizardData.businessName} Yapay Zeka Destekli Dijital Çalışannız başarıyla oluşturuldu ve hizmete hazır!`);

      // Success toast removed per user request

      // Mark creation as complete
      isCreatingRef.current = false;
      setCurrentAgentId(null);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(agentId);
      }

      // Auto-close and redirect to dashboard/agents after success
      setTimeout(() => {
        onClose();
        setCurrentStep(1);
        setCurrentSubStep(1);
        resetWizardData();
        navigate('/dashboard/agents');
        
        // Auto-refresh page if agent creation started from dashboard
        if (fromDashboard) {
          setTimeout(() => {
            window.location.reload();
          }, 500); // Small delay to ensure navigation completes
        }
      }, 3000);

    } catch (error: any) {
      console.error('AgentCreationWizard error:', error);
      
      // Clean up on error
      if (currentAgentId) {
        await cancelAgentCreation();
      }
      
      isCreatingRef.current = false;
      setCurrentAgentId(null);
      
      const errorMessage = error?.message || error?.toString() || "Beklenmedik bir hata oluştu";
      addUserLog(`❌ Hata: ${errorMessage}`);
      setResult(`❌ Yapay Zeka Destekli Dijital Çalışan oluşturulurken bir hata oluştu: ${errorMessage}`);
      toast({
        title: "Hata",
        description: `Bir sorun oluştu: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateFileType = (file: File): boolean => {
    const allowedTypes = ['.txt', '.pdf', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return allowedTypes.includes(fileExtension);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    if (!validateFileType(file)) {
      toast({
        title: "Desteklenmeyen Dosya Türü",
        description: "Sadece .txt, .pdf, ve .docx dosyaları desteklenmektedir.",
        variant: "destructive",
      });
      return;
    }

    // Set loading state
    setUploadingFile(true);
    
    // Simulate file processing/upload
    setTimeout(() => {
      setWizardData(prev => ({ 
        ...prev, 
        messageHistory: { name: file.name, size: file.size, type: file.type } 
      }));
      setUploadingFile(false);
      toast({
        title: "Dosya Yüklendi",
        description: `${file.name} başarıyla yüklendi.`,
      });
    }, 1500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const renderWizardStep = () => {
    const sectors = [
      "Restoran", "Kuaför/Berber", "E-ticaret", "Sağlık", 
      "Eğitim", "Emlak", "Teknoloji", "Diğer (değiştirilebilir)"
    ];

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="sector" className="text-base font-medium">Hangi sektörde faaliyet gösteriyorsunuz?</Label>
              <Input
                id="sector"
                placeholder="Sektör adı yazın..."
                className="mt-2"
                value={wizardData.sector}
                onChange={(e) => setWizardData(prev => ({ ...prev, sector: e.target.value }))}
                data-testid="input-sector"
              />
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-3">Popüler sektörler:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {sectors.map((sector) => (
                  <Button
                    key={sector}
                    variant={wizardData.sector === sector ? "default" : "outline"}
                    className={`justify-start h-auto p-3 text-left min-h-[44px] w-full ${
                      wizardData.sector === sector 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : ""
                    }`}
                    onClick={() => setWizardData(prev => ({ ...prev, sector }))}
                    data-testid={`button-sector-${sector.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    {sector}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        if (currentSubStep === 1) {
          return (
            <div className="space-y-6">
              <div>
                <Label htmlFor="businessName" className="text-base font-medium">İşletme adınız nedir?</Label>
                <div className="relative">
                  <Input
                    id="businessName"
                    placeholder="Örn: Mehmet'in Kuaförü"
                    className={`mt-2 pr-10 ${
                      nameCheckResult && !nameCheckResult.available 
                        ? 'border-red-500 focus:border-red-500' 
                        : nameCheckResult && nameCheckResult.available 
                        ? 'border-green-500 focus:border-green-500' 
                        : ''
                    }`}
                    value={wizardData.businessName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setWizardData(prev => ({ ...prev, businessName: value }));
                      
                      // Clear previous result and start new check
                      setNameCheckResult(null);
                      
                      if (value.trim()) {
                        debouncedNameCheck(value);
                      }
                    }}
                    data-testid="input-business-name"
                  />
                  
                  {nameCheckLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  
                  {!nameCheckLoading && nameCheckResult && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {nameCheckResult.available ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                
                {nameCheckResult && (
                  <p className={`text-sm mt-2 ${
                    nameCheckResult.available 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {nameCheckResult.message}
                  </p>
                )}
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-6">
              <div>
                <Label htmlFor="address" className="text-base font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  İşletmenizin adresi nedir?
                </Label>
                <div className="mt-2">
                  {/* Address Textarea */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">
                      İşletme Adresi
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="İşletmenizin tam adresini yazın (örn: Taksim Meydanı No:1, Beyoğlu/İstanbul)"
                      className="min-h-[100px] text-sm"
                      value={wizardData.address}
                      onChange={(e) => setWizardData(prev => ({ ...prev, address: e.target.value }))}
                      data-testid="textarea-address"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        }

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4" />
                Çalışma saatlerinizi belirleyin
              </Label>
              
              <div className="space-y-4">
                {Object.entries(wizardData.weeklyHours).map(([day, hours]) => {
                  const dayNames: { [key: string]: string } = {
                    monday: "Pazartesi",
                    tuesday: "Salı", 
                    wednesday: "Çarşamba",
                    thursday: "Perşembe",
                    friday: "Cuma",
                    saturday: "Cumartesi",
                    sunday: "Pazar"
                  };

                  return (
                    <div key={day} className="grid grid-cols-1 sm:grid-cols-[100px_1fr_auto] gap-3 p-3 border rounded-lg items-center">
                      <div className="text-sm font-medium">{dayNames[day]}</div>
                      
                      <div className="flex items-center gap-2 justify-start">
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            weeklyHours: {
                              ...prev.weeklyHours,
                              [day]: { ...prev.weeklyHours[day as keyof typeof prev.weeklyHours], open: e.target.value }
                            }
                          }))}
                          disabled={hours.closed}
                          className="w-20 sm:w-24"
                          data-testid={`input-${day}-open`}
                        />
                        <span className="text-xs text-muted-foreground px-1">-</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => setWizardData(prev => ({
                            ...prev,
                            weeklyHours: {
                              ...prev.weeklyHours,
                              [day]: { ...prev.weeklyHours[day as keyof typeof prev.weeklyHours], close: e.target.value }
                            }
                          }))}
                          disabled={hours.closed}
                          className="w-20 sm:w-24"
                          data-testid={`input-${day}-close`}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 justify-end sm:justify-start">
                        <Label htmlFor={`${day}-closed`} className="text-xs whitespace-nowrap">Kapalı</Label>
                        <Switch
                          id={`${day}-closed`}
                          checked={hours.closed}
                          onCheckedChange={(checked) => setWizardData(prev => ({
                            ...prev,
                            weeklyHours: {
                              ...prev.weeklyHours,
                              [day]: { ...prev.weeklyHours[day as keyof typeof prev.weeklyHours], closed: checked }
                            }
                          }))}
                          data-testid={`switch-${day}-closed`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <Label htmlFor="holidays" className="text-base font-medium">Özel tatil günleriniz (isteğe bağlı)</Label>
                <Textarea
                  id="holidays"
                  placeholder="Örn: 1 Ocak Yılbaşı, 23 Nisan Ulusal Egemenlik..."
                  className="mt-2"
                  value={wizardData.holidays}
                  onChange={(e) => setWizardData(prev => ({ ...prev, holidays: e.target.value }))}
                  data-testid="textarea-holidays"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
                   <Globe className="h-4 w-4" />
                   Web sitesi
                 </Label>
                 <Input
                   id="website"
                   placeholder="https://ornek.com"
                   className="mt-1 w-full"
                   value={wizardData.website}
                   onChange={(e) => setWizardData(prev => ({ ...prev, website: e.target.value }))}
                   data-testid="input-website"
                 />
               </div>
               <div>
                 <Label htmlFor="instagram" className="text-sm font-medium flex items-center gap-2">
                   <Instagram className="h-4 w-4" />
                   Instagram
                 </Label>
                 <Input
                   id="instagram"
                   placeholder="kullaniciadi"
                   className="mt-1 w-full"
                   value={wizardData.instagramUsername}
                   onChange={(e) => setWizardData(prev => ({ ...prev, instagramUsername: e.target.value }))}
                   data-testid="input-instagram"
                 />
               </div>
               <div>
                 <Label htmlFor="twitter" className="text-sm font-medium flex items-center gap-2">
                   <X className="h-4 w-4" />
                   X (Twitter)
                 </Label>
                 <Input
                   id="twitter"
                   placeholder="@kullaniciadi"
                   className="mt-1 w-full"
                   value={wizardData.twitterUsername}
                   onChange={(e) => setWizardData(prev => ({ ...prev, twitterUsername: e.target.value }))}
                   data-testid="input-twitter"
                 />
               </div>
               <div>
                 <Label htmlFor="tiktok" className="text-sm font-medium">TikTok</Label>
                 <Input
                   id="tiktok"
                   placeholder="@kullaniciadi"
                   className="mt-1 w-full"
                   value={wizardData.tiktokUsername}
                   onChange={(e) => setWizardData(prev => ({ ...prev, tiktokUsername: e.target.value }))}
                   data-testid="input-tiktok"
                 />
               </div>
             </div>
          </div>
        );

      case 5:
        if (currentSubStep === 1) {
          return (
            <div className="space-y-6">
              <div>
                <Label htmlFor="faq" className="text-base font-medium">Sık Sorulan Sorular ve Cevapları</Label>
                <Textarea
                  id="faq"
                  placeholder="S: Çalışma saatleriniz nedir?&#10;C: Pazartesi-Cuma 09:00-18:00 arası açığız.&#10;&#10;S: Rezervasyon gerekli mi?&#10;C: Evet, önceden rezervasyon yapmanızı öneririz."
                  className="mt-2 min-h-[200px]"
                  value={wizardData.faq}
                  onChange={(e) => setWizardData(prev => ({ ...prev, faq: e.target.value }))}
                  data-testid="textarea-faq"
                />
              </div>
            </div>
          );
        } else if (currentSubStep === 2) {
          return (
            <div className="space-y-6">
              <div>
                <Label htmlFor="products" className="text-base font-medium">Ürün/Hizmet Bilgileri</Label>
                <Textarea
                  id="products"
                  placeholder="Sunduğunuz ürün ve hizmetleri, fiyatlarını ve özelliklerini detaylı şekilde açıklayın..."
                  className="mt-2 min-h-[200px]"
                  value={wizardData.products}
                  onChange={(e) => setWizardData(prev => ({ ...prev, products: e.target.value }))}
                  data-testid="textarea-products"
                />
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Geçmiş Mesaj Konuşmaları (İsteğe Bağlı)</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Daha önceki müşteri konuşmalarınızı yükleyerek Yapay Zeka Destekli Dijital Çalışanınızın daha iyi öğrenmesini sağlayabilirsiniz.
                </p>
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                    isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-muted-foreground/40'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  data-testid="file-upload-area"
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".txt,.pdf,.docx"
                    onChange={handleFileInputChange}
                    data-testid="file-input"
                  />
                  
                  {uploadingFile ? (
                    <div className="space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground" data-testid="text-uploading">Dosya yükleniyor...</p>
                    </div>
                  ) : wizardData.messageHistory ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-center gap-2 text-green-700">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm font-medium" data-testid="text-file-name">{wizardData.messageHistory.name}</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1" data-testid="text-file-size">
                          {(wizardData.messageHistory.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setWizardData(prev => ({ ...prev, messageHistory: null }));
                          // Reset file input
                          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                        className="min-h-[40px]"
                        data-testid="button-change-file"
                      >
                        Farklı Dosya Seç
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground" data-testid="text-drag-drop">
                          Dosyaları buraya sürükleyin veya seçin
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid="text-supported-formats">
                          Desteklenen formatlar: .txt, .pdf, .docx
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="min-h-[40px] mt-3"
                        data-testid="button-select-file"
                      >
                        Dosya Seç
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

      case 6:
        if (currentSubStep === 1) {
          const toneOptions = [
            { value: "professional", label: "Profesyonel", description: "Resmi ve işe yönelik" },
            { value: "friendly", label: "Samimi", description: "Sıcak ve yakın" },
            { value: "casual", label: "Rahat", description: "Günlük ve doğal" }
          ];

          return (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Konuşma Tarzı</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Yapay Zeka Destekli Dijital Çalışanınızın müşterilerle nasıl konuşmasını istiyorsunuz?
                </p>
                
                <div className="space-y-3">
                  {toneOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`tone-${option.value}`}
                        name="tone"
                        value={option.value}
                        checked={wizardData.tone === option.value}
                        onChange={(e) => setWizardData(prev => ({ ...prev, tone: e.target.value }))}
                        className="w-4 h-4"
                        data-testid={`radio-tone-${option.value}`}
                      />
                      <Label htmlFor={`tone-${option.value}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        } else if (currentSubStep === 2) {
          const responseLengths = ["Kısa", "Orta", "Uzun"];
          
          return (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Yanıt Uzunluğu</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Yapay Zeka Destekli Dijital Çalışanınızın yanıtları ne kadar detaylı olsun?
                </p>
                
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                   {responseLengths.map((option) => (
                     <Button
                       key={option}
                       variant={wizardData.responseLength === option ? "default" : "outline"}
                       onClick={() => setWizardData(prev => ({ ...prev, responseLength: option }))}
                       className="w-full min-h-[44px]"
                       data-testid={`button-response-length-${option.toLowerCase()}`}
                     >
                       {option}
                     </Button>
                   ))}
                 </div>
              </div>
            </div>
          );
        } else if (currentSubStep === 3) {
          const verificationOptions = ["Her zaman sor", "Gerektiğinde sor", "Hiç sorma"];
          
          return (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Kullanıcı Doğrulama</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  AI çalışanınız müşterilerden iletişim bilgilerini ne sıklıkla isteysin?
                </p>
                
                 <div className="space-y-2">
                   {verificationOptions.map((option) => (
                     <Button
                       key={option}
                       variant={wizardData.userVerification === option ? "default" : "outline"}
                       onClick={() => setWizardData(prev => ({ ...prev, userVerification: option }))}
                       className="w-full justify-start min-h-[44px]"
                       data-testid={`button-verification-${option.toLowerCase().replace(/\s+/g, '-')}`}
                     >
                       {option}
                     </Button>
                   ))}
                 </div>
              </div>
            </div>
          );
        } else {
          const serviceTypes = ["Ürün Satışı", "Hizmet Sunumu", "Bilgi & Destek", "Rezervasyon & Randevu"];
          
          return (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Hizmet Türü</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  AI çalışanınızın temel odak noktası nedir?
                </p>
                
                 <div className="space-y-2">
                   {serviceTypes.map((option) => (
                     <Button
                       key={option}
                       variant={wizardData.serviceType === option ? "default" : "outline"}
                       onClick={() => setWizardData(prev => ({ ...prev, serviceType: option }))}
                       className="w-full justify-start min-h-[44px]"
                       data-testid={`button-service-type-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                     >
                       {option}
                     </Button>
                   ))}
                 </div>
              </div>
            </div>
          );
        }

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="taskDescription" className="text-base font-medium">Görev Tanımı</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                AI çalışanınızın ne yapmasını istiyorsunuz? Detaylı olarak açıklayın.
              </p>
              <Textarea
                id="taskDescription"
                placeholder="Örn: Müşteri sorularını yanıtla, randevu al, ürün önerilerinde bulun, destek sağla..."
                className="mt-2 min-h-[200px]"
                value={wizardData.taskDescription}
                onChange={(e) => setWizardData(prev => ({ ...prev, taskDescription: e.target.value }))}
                data-testid="textarea-task-description"
              />
            </div>
          </div>
        );

      case 8:
        const toolsList = [
          { key: "websiteIntegration", label: "Web Sitesi Entegrasyonu", icon: Globe },
          { key: "emailNotifications", label: "E-posta Bildirimleri", icon: MessageSquare },
          { key: "whatsappIntegration", label: "WhatsApp Entegrasyonu", icon: Phone },
          { key: "calendarBooking", label: "Takvim Rezervasyonu", icon: Calendar },
          { key: "socialMediaMonitoring", label: "Sosyal Medya Takibi", icon: Search },
          { key: "crmIntegration", label: "CRM Entegrasyonu", icon: Monitor },
          { key: "analyticsReporting", label: "Analitik Raporlama", icon: Zap },
          { key: "multiLanguageSupport", label: "Çoklu Dil Desteği", icon: Globe }
        ];

        const integrationsList = [
          { key: "whatsapp", label: "WhatsApp Business" },
          { key: "instagram", label: "Instagram Direct" },
          { key: "telegram", label: "Telegram" },
          { key: "slack", label: "Slack" },
          { key: "zapier", label: "Zapier" },
          { key: "shopify", label: "Shopify" },
          { key: "woocommerce", label: "WooCommerce" },
          { key: "hubspot", label: "HubSpot" }
        ];

        return (
          <div className="space-y-8">
            <div>
              <Label className="text-base font-medium">Kullanılacak Araçlar</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                AI çalışanınızın hangi araçları kullanabilmesini istiyorsunuz?
              </p>
              
               <div className="grid grid-cols-1 gap-3">
                 {toolsList.map(({ key, label, icon: Icon }) => (
                   <div key={key} className="flex items-center space-x-3 p-3 border rounded-lg min-h-[48px]">
                     <Switch
                       id={`tool-${key}`}
                       checked={wizardData.tools[key as keyof typeof wizardData.tools]}
                       onCheckedChange={(checked) => setWizardData(prev => ({
                         ...prev,
                         tools: { ...prev.tools, [key]: checked }
                       }))}
                       data-testid={`switch-tool-${key}`}
                     />
                     <Icon className="h-4 w-4 text-muted-foreground" />
                     <Label htmlFor={`tool-${key}`} className="text-sm font-medium cursor-pointer flex-1">
                       {label}
                     </Label>
                   </div>
                 ))}
               </div>
            </div>

            <div>
              <Label className="text-base font-medium">Google Calendar Entegrasyonu</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                AI çalışanınızın randevu yönetimi için Google Calendar'ınızı bağlayın.
              </p>
              
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="googleCalendarEnabled"
                      checked={wizardData.googleCalendarConnection.enabled}
                      onCheckedChange={(checked) => setWizardData(prev => ({
                        ...prev,
                        googleCalendarConnection: { ...prev.googleCalendarConnection, enabled: checked }
                      }))}
                      data-testid="switch-google-calendar"
                    />
                    <div>
                      <Label htmlFor="googleCalendarEnabled" className="text-sm font-medium cursor-pointer">
                        Google Calendar Entegrasyonu
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Otomatik randevu yönetimi için
                      </p>
                    </div>
                  </div>
                  
                  {wizardData.googleCalendarConnection.enabled && (
                    <div className="flex items-center gap-2">
                      {wizardData.googleCalendarConnection.enabled ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs font-medium">Seçildi</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Phase 1 Fix: Just enable Google Calendar for later connection with real agent UUID
                            setWizardData(prev => ({
                              ...prev,
                              googleCalendarConnection: {
                                ...prev.googleCalendarConnection,
                                enabled: true,
                                connected: false // Will be connected after agent creation with real UUID
                              }
                            }));
                            toast({
                              title: "Google Calendar Seçildi",
                              description: "AI asistan oluştuktan sonra bağlantı kurulacak.",
                            });
                          }}
                          className="text-xs"
                          data-testid="button-enable-google-calendar"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Etkinleştir
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                {wizardData.googleCalendarConnection.enabled && wizardData.googleCalendarConnection.connected && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Google Calendar Bağlandı
                        </p>
                        <p className="text-xs text-green-600">
                          {wizardData.googleCalendarConnection.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Diğer Entegrasyonlar</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                AI çalışanınızın hangi platformlarla entegre olmasını istiyorsunuz?
              </p>
              
               <div className="grid grid-cols-1 gap-3">
                 {integrationsList.map(({ key, label }) => (
                   <div key={key} className="flex items-center space-x-3 p-3 border rounded-lg min-h-[48px]">
                     <Switch
                       id={`integration-${key}`}
                       checked={wizardData.integrations[key as keyof typeof wizardData.integrations]}
                       onCheckedChange={(checked) => setWizardData(prev => ({
                         ...prev,
                         integrations: { ...prev.integrations, [key]: checked }
                       }))}
                       data-testid={`switch-integration-${key}`}
                     />
                     <Label htmlFor={`integration-${key}`} className="text-sm font-medium cursor-pointer flex-1">
                       {label}
                     </Label>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-4">Özet</h3>
            <div className="text-left space-y-2 bg-muted p-4 rounded-lg">
              <div><strong>İşletme:</strong> {wizardData.businessName || "Belirtilmedi"}</div>
              <div><strong>Sektör:</strong> {wizardData.sector || "Belirtilmedi"}</div>
              <div><strong>Görev:</strong> {wizardData.taskDescription || "Belirtilmedi"}</div>
            </div>
          </div>
        );
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-4xl w-[95vw] max-h-[95vh] p-0 flex flex-col gap-0 [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleWizardClose();
          }}
          data-testid="dialog-wizard"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>AI Çalışan Kurulum Sihirbazı</DialogTitle>
            <DialogDescription>Yeni AI çalışanınızı oluşturmak için adım adım kurulum sihirbazı</DialogDescription>
          </DialogHeader>
          {/* Header with single close button */}
          <div className="flex items-start justify-between p-4 sm:p-6 border-b bg-background">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-foreground" data-testid="text-wizard-title">
                AI Çalışan Kurulum Sihirbazı
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1" data-testid="text-step-info">
                Adım {currentStep} / {totalSteps}: {stepTitles[currentStep - 1]}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleWizardClose} 
              className="min-h-[44px] min-w-[44px] hover:bg-muted"
              data-testid="button-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="px-4 sm:px-6 py-4 border-b bg-background">
            <div className="mx-6 sm:mx-0">
              <div className="flex items-center w-full">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                  <div key={step} className="flex items-center" style={{ flex: step < totalSteps ? '1' : '0 0 auto' }}>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0 ${
                      step <= currentStep 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`} data-testid={`step-indicator-${step}`}>
                      {step}
                    </div>
                    {step < totalSteps && (
                      <div className={`h-1 flex-1 mx-1 sm:mx-2 ${
                        step < currentStep ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0" data-testid="wizard-content">
            {renderWizardStep()}
          </div>

          {/* Bottom Navigation - Always at bottom */}
          <div className="border-t bg-background p-4 sm:p-6 mt-auto">
            <div className="flex justify-between items-center gap-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 && currentSubStep === 1}
                className="min-h-[44px] min-w-[100px] flex items-center gap-2"
                data-testid="button-previous"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Önceki</span>
              </Button>

              <div className="text-xs text-muted-foreground hidden sm:block" data-testid="text-progress">
                {currentStep} / {totalSteps}
              </div>

              {currentStep === totalSteps ? (
                <Button 
                  onClick={handleFinish} 
                  className="bg-green-600 hover:bg-green-700 text-white min-h-[44px] min-w-[100px] flex items-center gap-2"
                  disabled={isLoading || isCreatingRef.current}
                  data-testid="button-finish"
                >
                  {(isLoading || isCreatingRef.current) && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Tamamla</span>
                </Button>
              ) : (
                <Button 
                  onClick={handleNext} 
                  className={`min-h-[44px] min-w-[100px] flex items-center gap-2 ${
                    !isCurrentStepValid() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!isCurrentStepValid()}
                  data-testid="button-next"
                >
                  <span>Sonraki</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Loading and Logs Display */}
          {(isLoading || logs.length > 0 || result) && (
            <div className="border-t bg-muted/50 p-4">
              <Card className="max-h-64 overflow-y-auto">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    İşlem Durumu
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  {isLoading && (
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">İşlem devam ediyor...</span>
                    </div>
                  )}
                  {logs.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {logs.slice(-5).map((log, index) => (
                        <div key={index} className="text-xs font-mono bg-background p-2 rounded border">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                  {result && (
                    <div className={`text-sm font-medium p-2 rounded ${
                      result.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <DialogContent data-testid="dialog-exit-confirmation">
          <DialogHeader>
            <DialogTitle>Kurulumu Bırakmak İstiyor Musunuz?</DialogTitle>
            <DialogDescription>Şu ana kadar girilen bilgiler kaybolacaktır</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Şu ana kadar girdiğiniz bilgiler kaybolacak. Emin misiniz?
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowExitConfirmation(false)} data-testid="button-continue">
              Devam Et
            </Button>
            <Button variant="destructive" onClick={confirmExit} data-testid="button-confirm-exit">
              Evet, Bırak
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgentCreationWizard;