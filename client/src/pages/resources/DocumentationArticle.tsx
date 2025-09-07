import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, Clock, Rocket, Puzzle, Wrench } from "lucide-react";

const DocumentationArticle = () => {
  const { sectionId, articleIndex } = useParams();
  const navigate = useNavigate();

  const sections = [
    {
      id: "getting-started",
      title: "Başlangıç",
      icon: Rocket,
      articles: [
        { title: "Nonplo'ya Hoş Geldiniz", lastUpdated: "2024-01-15", content: "Nonplo ile Yapay Zeka Destekli Dijital Çalışan oluşturmanın temellerini öğrenin.", fullContent: "Nonplo, herkesin kolayca yapay zeka ajanları oluşturabileceği bir platformdur. Bu döküman ile platformumuzun temel özelliklerini ve nasıl kullanacağınızı öğreneceksiniz.\n\nNonplo'nun sunduğu temel özellikler:\n• Kodsuz Yapay Zeka Destekli Dijital Çalışan oluşturma\n• Çoklu dil desteği\n• Gerçek zamanlı analitik\n• Kolay entegrasyon seçenekleri\n\nBu rehber ile adım adım ilk ajanınızı oluşturmaya başlayabilirsiniz." },
        { title: "İlk Dijital Çalışanınızı Kurma", lastUpdated: "2024-01-12", content: "İlk Yapay Zeka Destekli Dijital Çalışanınızı oluşturmak için adım adım rehber.", fullContent: "İlk ajanınızı oluşturmak için şu adımları takip edin:\n\n1. Hesabınıza giriş yapın\n2. 'Yeni Ajan Oluştur' butonuna tıklayın\n3. Ajanınızın amacını belirleyin\n4. Temel ayarları yapılandırın\n5. Test edin ve yayınlayın\n\nHer adımda size rehberlik edecek detaylı açıklamalar bulacaksınız." },
        { title: "Ajan Türlerini Anlama", lastUpdated: "2024-01-10", content: "Farklı ajan türleri ve kullanım alanları.", fullContent: "Nonplo'da üç farklı ajan türü bulunmaktadır:\n\n• Sohbet Ajanları: Müşteri hizmetleri için idealdir\n• Görev Ajanları: Belirli işlemleri otomatize eder\n• Analiz Ajanları: Veri analizi ve raporlama yapar\n\nHer ajan türünün kendine özgü avantajları ve kullanım alanları vardır." },
        { title: "Hesap Kurulumu ve Onboarding", lastUpdated: "2024-01-08", content: "Nonplo hesabınızı kurma konusunda kapsamlı rehber.", fullContent: "Nonplo hesabınızı kurmak ve platform ile tanışmak için:\n\n1. Kayıt olun\n2. E-posta adresinizi doğrulayın\n3. Profil bilgilerinizi tamamlayın\n4. İlk adımlar turunu tamamlayın\n5. Ödeme bilgilerinizi ekleyin (isteğe bağlı)\n\nHesap kurulumu tamamlandıktan sonra platform özelliklerini keşfetmeye başlayabilirsiniz." }
      ]
    },
    {
      id: "building-agents",
      title: "Ajan Geliştirme",
      icon: Puzzle,
      articles: [
        { title: "Ajan Konfigürasyonu", lastUpdated: "2024-01-14", content: "Yapay zeka ajanlarınızı optimal performans için nasıl yapılandıracağınızı öğrenin.", fullContent: "Ajanınızı en iyi performans için yapılandırmak:\n\n• Doğru parametreleri seçin\n• Model ayarlarını optimize edin\n• Yanıt sürelerini ayarlayın\n• Güvenlik ayarlarını yapılandırın\n\nBu ayarlar ajanınızın performansını doğrudan etkileyecektir." },
        { title: "Ajanınızı Eğitme", lastUpdated: "2024-01-11", content: "Yapay zeka ajanlarını verilerinizle eğitmek için en iyi uygulamalar.", fullContent: "Ajanınızı eğitirken dikkat edilmesi gerekenler:\n\n1. Kaliteli veri kullanın\n2. Çeşitli senaryolar ekleyin\n3. Düzenli olarak güncelleyin\n4. Test edin ve iyileştirin\n\nDoğru eğitim ajanınızın başarısının anahtarıdır." },
        { title: "Test ve Hata Ayıklama", lastUpdated: "2024-01-09", content: "Ajan yanıtlarını test etmek için araçlar ve teknikler.", fullContent: "Ajanınızı test etmek için sunduğumuz araçlar:\n\n• Gerçek zamanlı test konsolu\n• A/B test desteği\n• Performans metrikleri\n• Hata raporları\n\nDüzenli testler ile ajanınızın kalitesini artırabilirsiniz." },
        { title: "Ajanınızı Yayınlama", lastUpdated: "2024-01-07", content: "Ajanınızı dağıtın ve kullanıcılara sunun.", fullContent: "Ajanınızı yayınlamak için:\n\n1. Son testleri yapın\n2. Yayın ayarlarını belirleyin\n3. Erişim izinlerini yapılandırın\n4. Yayınlayın\n5. Performansı izleyin\n\nYayın sonrası sürekli izleme önemlidir." }
      ]
    },
    {
      id: "integrations",
      title: "Entegrasyonlar",
      icon: Puzzle,
      articles: [
        { title: "API Entegrasyon Rehberi", lastUpdated: "2024-01-13", content: "Nonplo'yu mevcut araçlar ve iş akışlarınızla bağlayın.", fullContent: "API entegrasyonu için:\n\n• REST API dokümantasyonu\n• SDK'lar ve kütüphaneler\n• Webhook desteği\n• Güvenlik protokolleri\n\nEntegrasyon sürecini kolaylaştıracak araçlarımızı kullanın." },
        { title: "Webhook Kurulumu", lastUpdated: "2024-01-10", content: "Gerçek zamanlı veri senkronizasyonu için webhook'ları yapılandırın.", fullContent: "Webhook kurulumu adımları:\n\n1. Webhook URL'inizi belirleyin\n2. Güvenlik ayarlarını yapın\n3. Event türlerini seçin\n4. Test edin\n5. Aktif hale getirin\n\nWebhook'lar gerçek zamanlı entegrasyon sağlar." },
        { title: "Üçüncü Taraf Bağlayıcılar", lastUpdated: "2024-01-06", content: "Popüler iş araçlarıyla mevcut entegrasyonlar.", fullContent: "Desteklenen entegrasyonlar:\n\n• Slack\n• Microsoft Teams\n• Salesforce\n• HubSpot\n• Zendesk\n\nDaha fazla entegrasyon seçeneği için dokümantasyonu inceleyin." },
        { title: "Özel Entegrasyonlar", lastUpdated: "2024-01-05", content: "Geliştirici araçlarımızı kullanarak özel entegrasyonlar oluşturun.", fullContent: "Özel entegrasyon geliştirmek için:\n\n• Geliştirici hesabı oluşturun\n• API anahtarlarını alın\n• SDK'ları indirin\n• Dokümantasyonu inceleyin\n• Test ortamını kullanın\n\nTeknik destek ekibimiz size yardımcı olmaya hazır." }
      ]
    },
    {
      id: "troubleshooting",
      title: "Sorun Giderme",
      icon: Wrench,
      articles: [
        { title: "Yaygın Sorunlar ve Çözümler", lastUpdated: "2024-01-12", content: "En yaygın sorunlar için hızlı çözümler.", fullContent: "Sık karşılaşılan sorunlar ve çözümleri:\n\n• Ajan yanıt vermiyor\n• Yavaş performans\n• Entegrasyon hataları\n• Hesap erişim sorunları\n\nHer sorun için detaylı çözüm adımları sunuyoruz." },
        { title: "Performans Optimizasyonu", lastUpdated: "2024-01-08", content: "Ajanınızın yanıt süresi ve doğruluğunu artırın.", fullContent: "Performansı artırmak için:\n\n1. Model parametrelerini optimize edin\n2. Veri kalitesini artırın\n3. Gereksiz işlemleri azaltın\n4. Önbellek stratejisi kullanın\n\nPerformans metrikleri ile iyileştirmeleri izleyin." },
        { title: "Hata Kodu Referansı", lastUpdated: "2024-01-04", content: "Hata kodlarının ve anlamlarının tam listesi.", fullContent: "Sistem hata kodları:\n\n• 400: Geçersiz istek\n• 401: Yetkilendirme hatası\n• 403: Erişim yasak\n• 429: Oran sınırı aşıldı\n• 500: Sunucu hatası\n\nHer hata kodu için çözüm önerileri mevcuttur." },
        { title: "Destek Alma", lastUpdated: "2024-01-03", content: "Yardım için destek ekibimizle nasıl iletişime geçeceğinizi öğrenin.", fullContent: "Destek almak için:\n\n• Canlı sohbet özelliğini kullanın\n• E-posta ile iletişime geçin\n• Topluluk forumlarını ziyaret edin\n• Video görüşme planlayın\n\nDestek ekibimiz 7/24 hizmetinizdedir." }
      ]
    }
  ];

  const currentSection = sections.find(section => section.id === sectionId);
  const currentArticle = currentSection?.articles[parseInt(articleIndex || "0")];

  if (!currentSection || !currentArticle) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Döküman bulunamadı</h1>
            <Button onClick={() => navigate("/resources/documentation")}>
              Dokümantasyona Dön
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Article Content */}
      <section className="pt-32 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              onClick={() => navigate("/resources/documentation")}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dokümantasyona Dön
            </Button>

            {/* Article Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <currentSection.icon className="w-6 h-6 text-primary" />
                  <span className="text-sm text-muted-foreground font-medium">
                    {currentSection.title}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  {currentArticle.title}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Clock className="w-4 h-4" />
                  Son güncelleme: {currentArticle.lastUpdated}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="prose prose-lg max-w-none">
                  <div className="text-muted-foreground whitespace-pre-line">
                    {currentArticle.fullContent || currentArticle.content}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-12 pt-8 border-t">
                  <div>
                    {parseInt(articleIndex || "0") > 0 && (
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/resources/documentation/${sectionId}/${parseInt(articleIndex || "0") - 1}`)}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Önceki
                      </Button>
                    )}
                  </div>
                  <div>
                    {parseInt(articleIndex || "0") < currentSection.articles.length - 1 && (
                      <Button 
                        onClick={() => navigate(`/resources/documentation/${sectionId}/${parseInt(articleIndex || "0") + 1}`)}
                      >
                        Sonraki
                        <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DocumentationArticle;