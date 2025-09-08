import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactFormDialog from "@/components/dialogs/ContactFormDialog";
import { Search, BookOpen, Rocket, Puzzle, Wrench, Clock, Menu, X, ChevronDown, ChevronRight } from "lucide-react";

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("getting-started");
  const [activeArticle, setActiveArticle] = useState(0);
  const [expandedSections, setExpandedSections] = useState<string[]>(["getting-started"]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const sections = [
    {
      id: "getting-started",
      title: "Başlangıç",
      icon: Rocket,
      articles: [
        { 
          title: "Nonplo'ya Hoş Geldiniz", 
          lastUpdated: "2024-01-15", 
          content: "Nonplo ile Yapay Zeka Destekli Dijital Çalışan oluşturmanın temellerini öğrenin.",
          fullContent: `# Nonplo'ya Hoş Geldiniz

Nonplo, işletmeniz için güçlü Yapay Zeka Destekli Dijital Çalışanlar oluşturmanızı sağlayan modern bir platformdur.

## Platform Özellikleri

- **Kolay Kurulum**: Hiçbir teknik bilgi gerektirmeden dakikalar içinde ajanınızı oluşturun
- **Güçlü Entegrasyonlar**: Mevcut araçlarınızla sorunsuz entegrasyon
- **Akıllı Öğrenme**: Ajanınız zamanla daha da akıllı hale gelir

## Hızlı Başlangıç

1. Hesabınızı oluşturun
2. İlk ajanınızı yapılandırın
3. Test edin ve yayınlayın

Detaylı adımlar için **İlk Ajanınızı Kurma** rehberine göz atın.`
        },
        { 
          title: "İlk Ajanınızı Kurma", 
          lastUpdated: "2024-01-12", 
          content: "İlk Yapay Zeka Destekli Dijital Çalışanınızı oluşturmak için adım adım rehber.",
          fullContent: `# İlk Ajanınızı Kurma

Bu rehber ile ilk Yapay Zeka Destekli Dijital Çalışanınızı oluşturacaksınız.

## Adım 1: Yeni Ajan Oluşturma

Dashboard'dan **Yeni Ajan** butonuna tıklayın ve ajan türünüzü seçin.

## Adım 2: Temel Bilgileri Girme

- Ajan adı
- Açıklama
- Sektör bilgisi

## Adım 3: Kişilik ve Davranış

Ajanınızın nasıl yanıt vereceğini belirleyin.`
        },
        { 
          title: "Dijital Çalışan Türlerini Anlama", 
          lastUpdated: "2024-01-10", 
          content: "Farklı ajan türleri ve kullanım alanları.",
          fullContent: `# Dijital Çalışan Türleri

Nonplo farklı ihtiyaçlar için çeşitli ajan türleri sunar.

## Müşteri Destek Ajanı

- 7/24 müşteri desteği
- Yaygın soruları yanıtlama
- Bilet yönlendirme

## Satış Ajanı

- Lead kalifikasyonu
- Ürün önerileri
- Randevu planlama`
        },
        { 
          title: "Hesap Kurulumu ve Onboarding", 
          lastUpdated: "2024-01-08", 
          content: "Nonplo hesabınızı kurma konusunda kapsamlı rehber.",
          fullContent: `# Hesap Kurulumu

Nonplo hesabınızı kurmak ve optimize etmek için detaylı rehber.

## Hesap Oluşturma

1. E-posta ile kayıt olun
2. E-posta adresinizi doğrulayın
3. Profil bilgilerinizi tamamlayın

## İlk Ayarlar

- Bildirim tercihlerinizi ayarlayın
- Güvenlik ayarlarını yapılandırın`
        }
      ]
    },
    {
      id: "building-agents",
      title: "Dijital Çalışan Geliştirme",
      icon: Puzzle,
      articles: [
        { 
          title: "Dijital Çalışan Konfigürasyonu", 
          lastUpdated: "2024-01-14", 
          content: "Yapay Zeka Destekli Dijital Çalışanlarınızı optimal performans için nasıl yapılandıracağınızı öğrenin.",
          fullContent: `# Dijital Çalışan Konfigürasyonu

Ajanınızı en iyi performans için yapılandırın.

## Temel Ayarlar

- **Dil Modeli**: Uygun AI modeli seçimi
- **Yanıt Süresi**: Optimal yanıt süreleri
- **Kişilik**: Tutarlı karakter geliştirme

## Gelişmiş Ayarlar

\`\`\`json
{
  "model": "gpt-4",
  "temperature": 0.7,
  "max_tokens": 1000
}
\`\`\``
        },
        { 
          title: "Dijital Çalışanınızı Eğitme", 
          lastUpdated: "2024-01-11", 
          content: "Yapay Zeka Destekli Dijital Çalışanlarını verilerinizle eğitmek için en iyi uygulamalar.",
          fullContent: `# Dijital Çalışan Eğitimi

Ajanınızı işletmenize özel verilerle eğitin.

## Eğitim Verileri

- FAQ dökümanları
- Ürün katalogları
- Şirket politikaları

## Eğitim Süreci

1. Verileri yükleyin
2. Kalite kontrolü yapın
3. Test edin ve optimize edin`
        },
        { 
          title: "Test ve Hata Ayıklama", 
          lastUpdated: "2024-01-09", 
          content: "Dijital Çalışan yanıtlarını test etmek için araçlar ve teknikler.",
          fullContent: `# Test ve Hata Ayıklama

Ajanınızın performansını test edin ve iyileştirin.

## Test Araçları

- **Simülasyon Modu**: Güvenli test ortamı
- **A/B Testing**: Farklı konfigürasyonları karşılaştırma
- **Analytics**: Detaylı performans metrikleri`
        },
        { 
          title: "Dijital Çalışanınızı Yayınlama", 
          lastUpdated: "2024-01-07", 
          content: "Dijital Çalışanınızı dağıtın ve kullanıcılara sunun.",
          fullContent: `# Ajanınızı Yayınlama

Ajanınızı canlı ortama almak için son adımlar.

## Yayın Öncesi Kontroller

✅ Tüm testler başarılı
✅ Yedekleme ayarları aktif
✅ Monitoring kurulu

## Yayın Süreci

1. Production ayarlarını kontrol edin
2. Yayın butonuna tıklayın
3. İlk 24 saati yakından takip edin`
        }
      ]
    },
    {
      id: "integrations",
      title: "Entegrasyonlar",
      icon: Puzzle,
      articles: [
        { 
          title: "API Entegrasyon Rehberi", 
          lastUpdated: "2024-01-13", 
          content: "Nonplo'yu mevcut araçlar ve iş akışlarınızla bağlayın.",
          fullContent: `# API Entegrasyon Rehberi

Nonplo API'sini kullanarak güçlü entegrasyonlar oluşturun.

## API Anahtarı

API anahtarınızı Settings > API bölümünden alabilirsiniz.

## Örnek Kullanım

\`\`\`javascript
const response = await fetch('https://api.nonplo.com/v1/agents', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});
\`\`\``
        },
        { 
          title: "Webhook Kurulumu", 
          lastUpdated: "2024-01-10", 
          content: "Gerçek zamanlı veri senkronizasyonu için webhook'ları yapılandırın.",
          fullContent: `# Webhook Kurulumu

Gerçek zamanlı bildirimler için webhook'ları yapılandırın.

## Webhook URL'i Ekleme

Settings > Webhooks bölümünden yeni webhook ekleyin.

## Event Türleri

- \`message.received\`: Yeni mesaj alındığında
- \`conversation.ended\`: Konuşma bittiğinde
- \`agent.error\`: Hata oluştuğunda`
        },
        { 
          title: "Üçüncü Taraf Bağlayıcılar", 
          lastUpdated: "2024-01-06", 
          content: "Popüler iş araçlarıyla mevcut entegrasyonlar.",
          fullContent: `# Üçüncü Taraf Entegrasyonlar

Popüler araçlarla hazır entegrasyonlar.

## Desteklenen Platformlar

- **Slack**: Ekip iletişimi
- **Telegram**: Müşteri desteği
- **WhatsApp Business**: Mobil destek
- **Zendesk**: Ticket yönetimi`
        },
        { 
          title: "Özel Entegrasyonlar", 
          lastUpdated: "2024-01-05", 
          content: "Geliştirici araçlarımızı kullanarak özel entegrasyonlar oluşturun.",
          fullContent: `# Özel Entegrasyonlar

Kendi entegrasyonlarınızı geliştirin.

## SDK'lar

- **JavaScript SDK**: Web uygulamaları için
- **Python SDK**: Backend entegrasyonları
- **REST API**: Her dil için uyumlu

## Örnek Proje

GitHub'daki örnek projeleri inceleyerek başlayın.`
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Sorun Giderme",
      icon: Wrench,
      articles: [
        { 
          title: "Yaygın Sorunlar ve Çözümler", 
          lastUpdated: "2024-01-12", 
          content: "En yaygın sorunlar için hızlı çözümler.",
          fullContent: `# Yaygın Sorunlar

En sık karşılaşılan sorunlar ve çözümleri.

## Ajan Yanıt Vermiyor

**Olası Nedenler:**
- API bağlantı sorunu
- Ajan durumu pasif
- Rate limit aşımı

**Çözümler:**
1. Ajan durumunu kontrol edin
2. API anahtarınızı yenileyin
3. Destek ekibiyle iletişime geçin`
        },
        { 
          title: "Performans Optimizasyonu", 
          lastUpdated: "2024-01-08", 
          content: "Dijital Çalışanınızın yanıt süresi ve doğruluğunu artırın.",
          fullContent: `# Performans Optimizasyonu

Ajanınızın performansını artırmak için ipuçları.

## Yanıt Süresini İyileştirme

- Model parametrelerini optimize edin
- Önbellek kullanın
- Gereksiz işlemleri kaldırın

## Doğruluğu Artırma

- Daha kaliteli eğitim verisi
- Düzenli model güncellemeleri
- Kullanıcı geri bildirimlerini değerlendirin`
        },
        { 
          title: "Hata Kodu Referansı", 
          lastUpdated: "2024-01-04", 
          content: "Hata kodlarının ve anlamlarının tam listesi.",
          fullContent: `# Hata Kodu Referansı

Sistem hata kodları ve açıklamaları.

## 4xx Hata Kodları

- **400 Bad Request**: Geçersiz istek formatı
- **401 Unauthorized**: Geçersiz API anahtarı
- **429 Too Many Requests**: Rate limit aşımı

## 5xx Hata Kodları

- **500 Internal Server Error**: Sunucu hatası
- **503 Service Unavailable**: Servis geçici olarak kullanılamıyor`
        },
        { 
          title: "Destek Alma", 
          lastUpdated: "2024-01-03", 
          content: "Yardım için destek ekibimizle nasıl iletişime geçeceğinizi öğrenin.",
          fullContent: `# Destek Alma

Teknik destek için iletişim yolları.

## Destek Kanalları

- **E-posta**: support@nonplo.com
- **Canlı Sohbet**: Platform içi chat
- **Telefon**: +90 (212) 123 45 67

## Destek Talep İpuçları

1. Sorunu detaylı açıklayın
2. Hata mesajlarını ekleyin
3. Adım adım repro adımları verin`
        }
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    articles: section.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.articles.length > 0);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectArticle = (sectionId: string, articleIndex: number) => {
    setActiveSection(sectionId);
    setActiveArticle(articleIndex);
    setIsMobileMenuOpen(false);
  };

  const currentSection = sections.find(s => s.id === activeSection);
  const currentArticle = currentSection?.articles[activeArticle];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <BookOpen className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Dokümantasyon
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Nonplo'yu etkili bir şekilde kullanmak için bilmeniz gereken her şey.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Dokümantasyonda ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Layout */}
      <section className="flex-1">
        <div className="max-w-7xl mx-auto">
          <div className="flex">
            {/* Mobile Menu Button */}
            <div className="lg:hidden fixed top-20 left-4 z-50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="bg-background shadow-md"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>

            {/* Left Sidebar */}
            <aside className={`
              fixed lg:sticky top-24 left-0 h-[calc(100vh-96px)] w-72 bg-background border-r border-border overflow-y-auto z-30
              transition-transform duration-300 ease-in-out
              ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
              <div className="p-6">
                <nav className="space-y-2">
                  {(searchQuery ? filteredSections : sections).map((section) => (
                    <div key={section.id} className="space-y-1">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-left text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <section.icon className="w-4 h-4 text-primary" />
                          <span>{section.title}</span>
                        </div>
                        {expandedSections.includes(section.id) ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                      </button>
                      
                      {expandedSections.includes(section.id) && (
                        <div className="ml-6 space-y-1">
                          {section.articles.map((article, index) => (
                            <button
                              key={index}
                              onClick={() => selectArticle(section.id, index)}
                              className={`
                                block w-full px-3 py-2 text-sm text-left rounded-lg transition-all duration-200
                                ${activeSection === section.id && activeArticle === index 
                                  ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' 
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                }
                              `}
                            >
                              {article.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-0 min-h-screen">
              <div className="max-w-4xl mx-auto px-6 lg:px-12 py-12">
                {currentArticle ? (
                  <div className="space-y-8">
                    {/* Article Header */}
                    <div className="border-b border-border pb-8">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <currentSection.icon className="w-4 h-4" />
                        <span>{currentSection?.title}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Son güncelleme: {currentArticle.lastUpdated}</span>
                        </div>
                      </div>
                      <h1 className="text-4xl font-bold text-foreground mb-4">
                        {currentArticle.title}
                      </h1>
                      <p className="text-xl text-muted-foreground leading-relaxed">
                        {currentArticle.content}
                      </p>
                    </div>

                    {/* Article Content */}
                    <div className="prose prose-lg max-w-none">
                      <div className="space-y-6 text-foreground leading-relaxed">
                        {currentArticle.fullContent.split('\n\n').map((paragraph, index) => {
                          if (paragraph.startsWith('# ')) {
                            return (
                              <h2 key={index} className="text-3xl font-bold text-foreground mt-12 mb-6">
                                {paragraph.substring(2)}
                              </h2>
                            );
                          }
                          if (paragraph.startsWith('## ')) {
                            return (
                              <h3 key={index} className="text-2xl font-semibold text-foreground mt-8 mb-4">
                                {paragraph.substring(3)}
                              </h3>
                            );
                          }
                          if (paragraph.startsWith('```')) {
                            const codeContent = paragraph.substring(3).split('\n').slice(1, -1).join('\n');
                            return (
                              <div key={index} className="bg-muted/30 rounded-xl p-6 my-6 overflow-x-auto">
                                <pre className="text-sm font-mono text-foreground">
                                  <code>{codeContent}</code>
                                </pre>
                              </div>
                            );
                          }
                          if (paragraph.startsWith('- ') || paragraph.includes('\n- ')) {
                            const items = paragraph.split('\n').filter(line => line.trim());
                            return (
                              <ul key={index} className="space-y-2 ml-6 my-4">
                                {items.map((item, i) => (
                                  <li key={i} className="list-disc text-foreground">
                                    {item.substring(2)}
                                  </li>
                                ))}
                              </ul>
                            );
                          }
                          if (paragraph.includes('✅')) {
                            return (
                              <div key={index} className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 my-4">
                                <p className="text-green-800 dark:text-green-200">{paragraph}</p>
                              </div>
                            );
                          }
                          return (
                            <p key={index} className="text-foreground leading-relaxed my-4">
                              {paragraph}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center pt-8 border-t border-border">
                      <div>
                        {activeArticle > 0 && (
                          <Button 
                            variant="outline" 
                            onClick={() => setActiveArticle(activeArticle - 1)}
                            className="flex items-center gap-2"
                          >
                            <ChevronDown className="w-4 h-4 rotate-90" />
                            Önceki
                          </Button>
                        )}
                      </div>
                      <div>
                        {currentSection && activeArticle < currentSection.articles.length - 1 && (
                          <Button 
                            variant="outline" 
                            onClick={() => setActiveArticle(activeArticle + 1)}
                            className="flex items-center gap-2"
                          >
                            Sonraki
                            <ChevronDown className="w-4 h-4 -rotate-90" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                    <h2 className="text-2xl font-semibold text-foreground mb-4">
                      Dokümantasyon seçin
                    </h2>
                    <p className="text-muted-foreground">
                      Sol menüden bir konu seçerek başlayın.
                    </p>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-12 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-semibold mb-2">Aradığınızı bulamıyor musunuz?</h3>
            <p className="text-muted-foreground mb-4">
              Destek ekibimiz Nonplo'dan en iyi şekilde faydalanmanız için burada
            </p>
            <ContactFormDialog>
              <Button variant="hero">
                Destek İle İletişime Geç
              </Button>
            </ContactFormDialog>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Documentation;