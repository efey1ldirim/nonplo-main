import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Monitor, Zap, MessageSquare, Loader2, Users, Sparkles, HeadphonesIcon, CalendarIcon, ShoppingCartIcon, HomeIcon, DumbbellIcon, BookOpenIcon, Bot, ArrowRight, CheckCircle, Mail, User, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AgentWizardModal from "@/components/wizard/AgentWizardModal";

const Builder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const location = useLocation();
  const [customRequest, setCustomRequest] = useState({
    fullName: "",
    email: "",
    businessName: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const templates = [
    {
      id: 1,
      title: "Müşteri Destek Asistanı",
      description: "7/24 müşteri sorularını yanıtlar ve destek sağlar",
      details: "Müşterilerinizin sorularını anında yanıtlar, sipariş takibi yapar ve teknik destek sağlar.",
      useCase: "E-ticaret siteleri, SaaS platformları"
    },
    {
      id: 2,
      title: "Rezervasyon Asistanı",
      description: "Otomatik randevu alır ve takvim yönetimi yapar",
      details: "Müşteri rezervasyonlarını otomatik olarak alır, uygun saatleri gösterir ve takvimi günceller.",
      useCase: "Restoranlar, kuaförler, klinikler"
    },
    {
      id: 3,
      title: "Satış Danışmanı",
      description: "Ürün önerileri yapar ve satış sürecini yönetir",
      details: "Müşteri ihtiyaçlarını analiz eder, uygun ürünleri önerir ve satış sürecini takip eder.",
      useCase: "Perakende, e-ticaret"
    },
    {
      id: 4,
      title: "Emlak Danışmanı",
      description: "Gayrimenkul sorularını yanıtlar ve tur ayarlar",
      details: "Emlak portföyünüzü tanıtır, müşteri sorularını yanıtlar ve gezme randevuları ayarlar.",
      useCase: "Emlak ofisleri, gayrimenkul yatırımcıları"
    },
    {
      id: 5,
      title: "Fitness Koçu",
      description: "Egzersiz planları ve beslenme tavsiyeleri verir",
      details: "Kişiselleştirilmiş antrenman programları oluşturur ve beslenme önerileri sunar.",
      useCase: "Spor salonları, fitness antrenörleri"
    },
    {
      id: 6,
      title: "Eğitim Asistanı",
      description: "Öğrenci sorularını yanıtlar ve ders programı yönetir",
      details: "Kurs içerikleri hakkında bilgi verir, ödev takibi yapar ve öğrenci ilerlemesini izler.",
      useCase: "Eğitim kurumları, online kurslar"
    }
  ];

  const sectors = ["Restoran", "E-Ticaret", "Güzellik Salonu", "Sağlık", "Eğitim"];

  const toneOptions = [
    "Resmî",
    "Samimi", 
    "Mizahi",
    "Kısa ve direkt",
    "Yaratıcı / Hikâyeleştiren"
  ];

  const handleTemplateUse = (template: any) => {
    setSelectedTemplate(template);
    setTemplateModalOpen(false);
    setWizardOpen(true);
  };

  const handleCustomRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customRequest.fullName,
          email: customRequest.email,
          company: customRequest.businessName,
          subject: "Özel Yapay Zeka Destekli Dijital Çalışan Talebi",
          message: customRequest.description
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      toast({
        title: "Talebiniz Gönderildi!",
        description: result.message || "Talebiniz başarıyla gönderildi. Ekibimiz en kısa sürede sizinle iletişime geçecek.",
      });

      setCustomRequest({
        fullName: "",
        email: "",
        businessName: "",
        description: ""
      });
    } catch (error) {
      console.error('Error sending custom request:', error);
      toast({
        title: "Hata!",
        description: error instanceof Error ? error.message : "Talep gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    if (search.get("openWizard") === "1") {
      setWizardOpen(true);
      // Clean the URL
      navigate("/builder", { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <div className="container mx-auto px-8 pt-24 pb-16">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Dijital Çalışanını
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
              Dakikalar İçinde Oluştur
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Nonplo Builder ile kendi AI çalışanını seç, özelleştir ve kullanmaya başla.
          </p>
        </div>

        {/* Hero CTA Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-32 max-w-4xl mx-auto">
          <Card 
            className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-white dark:bg-gray-900 rounded-2xl overflow-hidden"
            onClick={() => navigate('/dashboard')}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Monitor className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Dashboard'a Git</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Mevcut AI çalışanlarını yönet, performanslarını takip et ve yeni özellikler ekle.
                  </p>
                </div>
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl py-3 font-medium transition-all shadow-lg hover:shadow-xl">
                  Dashboard'u Aç
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl overflow-hidden relative"
            onClick={() => setWizardOpen(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10 group-hover:from-blue-500/20 group-hover:to-purple-600/20 transition-all duration-300 rounded-2xl"></div>
            <CardContent className="p-8 relative">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Çalışan Oluştur</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Sıfırdan yeni bir AI çalışanı oluştur. Adım adım rehberlik ile 5 dakikada hazır.
                  </p>
                </div>
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl py-3 font-medium transition-all shadow-lg hover:shadow-xl">
                  Sihirbazı Başlat
                  <Zap className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Çalışan Şablonları</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-light">
              Sektörünüze özel hazır şablonlardan birini seçin ve hemen kullanmaya başlayın
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map((template, index) => {
              const icons = [HeadphonesIcon, CalendarIcon, ShoppingCartIcon, HomeIcon, DumbbellIcon, BookOpenIcon];
              const IconComponent = icons[index] || Bot;
              
              return (
                <Card 
                  key={template.id} 
                  className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-white dark:bg-gray-900 rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setTemplateModalOpen(true);
                  }}
                >
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center text-center space-y-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <IconComponent className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{template.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                          {template.description}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all duration-200"
                      >
                        Hemen Kullan
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Contact Form Section */}
        <div className="max-w-6xl mx-auto">
          <Card className="border-0 shadow-2xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Form Section */}
                <div className="p-12">
                  <div className="mb-8">
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Yapay Zeka Destekli Dijital Çalışanını Senin Yerine Kuralım</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      İhtiyaçlarını anlat, biz senin için en uygun AI çalışanını tasarlayıp kuralım. Uzman ekibimizle birlikte kişiye özel çözümler geliştiriyoruz.
                    </p>
                  </div>
                  
                  <form onSubmit={handleCustomRequestSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="fullName" className="text-gray-700 dark:text-gray-300 font-medium mb-2 block">
                          <User className="w-4 h-4 inline mr-2" />
                          Ad Soyad
                        </Label>
                        <Input
                          id="fullName"
                          value={customRequest.fullName}
                          onChange={(e) => setCustomRequest(prev => ({ ...prev, fullName: e.target.value }))}
                          className="rounded-xl border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 py-3"
                          placeholder="Adınız ve soyadınız"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium mb-2 block">
                          <Mail className="w-4 h-4 inline mr-2" />
                          E-posta
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={customRequest.email}
                          onChange={(e) => setCustomRequest(prev => ({ ...prev, email: e.target.value }))}
                          className="rounded-xl border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 py-3"
                          placeholder="ornek@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="businessName" className="text-gray-700 dark:text-gray-300 font-medium mb-2 block">
                        <Building2 className="w-4 h-4 inline mr-2" />
                        İşletme Adı
                      </Label>
                      <Input
                        id="businessName"
                        value={customRequest.businessName}
                        onChange={(e) => setCustomRequest(prev => ({ ...prev, businessName: e.target.value }))}
                        className="rounded-xl border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 py-3"
                        placeholder="Şirket veya işletme adınız"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-gray-700 dark:text-gray-300 font-medium mb-2 block">
                        <MessageSquare className="w-4 h-4 inline mr-2" />
                        Mesajınız
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="İhtiyacınız olan AI çalışanı hakkında detaylı bilgi verin..."
                        value={customRequest.description}
                        onChange={(e) => setCustomRequest(prev => ({ ...prev, description: e.target.value }))}
                        className="rounded-xl border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 min-h-[150px] resize-none"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 rounded-xl py-4 font-medium transition-all shadow-lg hover:shadow-xl" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          Mesaj Gönder
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>

                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                      Özel çalışanlar ek geliştirme ücretlerine tabidir. Ekibimiz 24 saat içinde size dönüş yapacak.
                    </p>
                  </form>
                </div>

                {/* Visual Section */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-12 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-8 mx-auto shadow-2xl">
                      <Bot className="h-16 w-16 text-white" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7/24 Destek</h4>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      Uzman ekibimiz senin için en uygun AI çalışanını tasarlayacak.
                    </p>
                    <div className="mt-8 space-y-3">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span>Özel tasarım</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span>Hızlı kurulum</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span>Sürekli destek</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dijital Çalışan Oluşturma Sihirbazı */}
      <AgentWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={(agentId: string) => {
          setWizardOpen(false);
          navigate(`/dashboard/agents/${agentId}`);
        }}
      />

      {/* Template Details Modal */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.title}</DialogTitle>
            <DialogDescription>
              Şablon detaylarını inceleyin ve kullanmak istediğiniz şablonu seçin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p>{selectedTemplate?.details}</p>
            <div>
              <h4 className="font-semibold mb-2">Kullanım Alanı:</h4>
              <p className="text-muted-foreground">{selectedTemplate?.useCase}</p>
            </div>
            <Button 
              onClick={() => handleTemplateUse(selectedTemplate)} 
              className="w-full"
            >
              Bu Şablonu Kullan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Builder;