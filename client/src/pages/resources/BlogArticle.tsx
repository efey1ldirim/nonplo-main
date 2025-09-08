import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Calendar, User, ArrowLeft, Clock } from "lucide-react";

const BlogArticle = () => {
  const { articleId } = useParams();

  // Mock blog data - in a real app, this would come from an API
  const blogPosts = [
    {
      id: "1",
      title: "Yapay Zeka Destekli Dijital Çalışanlar ile İş Otomasyonunun Geleceği",
      content: `
        <p>Yapay Zeka Destekli Dijital Çalışanlar, modern iş dünyasında devrim niteliğinde değişiklikler yaratıyor. Bu teknoloji, işletmelerin operasyonel verimliliğini artırırken, çalışanların daha stratejik görevlere odaklanmasını sağlıyor.</p>
        
        <h2>Yapay Zeka Destekli Dijital Çalışanlarının Avantajları</h2>
        <p>Yapay Zeka Destekli Dijital Çalışanlar, 24/7 çalışabilme, hata oranlarını minimize etme ve büyük veri setlerini hızla işleyebilme gibi benzersiz avantajlar sunar. Bu özellikler, özellikle müşteri hizmetleri, veri analizi ve rutin görevlerin otomasyonu alanlarında büyük fayda sağlar.</p>
        
        <h2>Gelecek Beklentileri</h2>
        <p>Önümüzdeki yıllarda, Yapay Zeka Destekli Dijital Çalışanlarının daha da sofistike hale geleceği ve insan-makine işbirliğinin yeni boyutlara ulaşacağı öngörülüyor. Bu dönüşüm, işletmelerin rekabet avantajı elde etmesi için kritik öneme sahip.</p>
        
        <h2>Nonplo ile Fark</h2>
        <p>Nonplo platformu, bu dönüşümün merkezinde yer alarak, kullanıcı dostu arayüzü ve güçlü entegrasyonları ile Yapay Zeka Destekli Dijital Çalışanları herkes için erişilebilir kılıyor.</p>
      `,
      author: "Sarah Chen",
      publishDate: "2024-01-15",
      category: "Sektör İçgörüleri",
      readTime: "5 dk okuma"
    },
    {
      id: "2",
      title: "Nonplo 2.0: Gelişmiş Dijital Çalışan Oluşturucu ve Yeni Entegrasyonlar",
      content: `
        <p>Nonplo 2.0 ile birlikte platform tamamen yenilendi ve kullanıcı deneyimi bir üst seviyeye taşındı. Yeni sürümde yer alan özellikler, Yapay Zeka Destekli Dijital Çalışanlar oluşturma ve yönetme sürecini daha da kolaylaştırıyor.</p>
        
        <h2>Yeni Özellikler</h2>
        <p>Gelişmiş drag-drop arayüzü ile artık kod bilgisi olmadan karmaşık iş akışları oluşturabilirsiniz. 20'den fazla yeni entegrasyon seçeneği, CRM sistemlerinden e-ticaret platformlarına kadar geniş bir yelpazede bağlantı imkanı sunuyor.</p>
        
        <h2>Performans İyileştirmeleri</h2>
        <p>Yeni mimari ile %40 daha hızlı çalışan dijital çalışanlar ve gelişmiş analitik araçları, işletmenizin performansını gerçek zamanlı olarak takip etmenizi sağlıyor.</p>
        
        <h2>Güvenlik</h2>
        <p>Enterprise düzeyinde güvenlik özellikleri ve GDPR uyumluluğu ile verileriniz tamamen korunuyor.</p>
      `,
      author: "Mike Rodriguez",
      publishDate: "2024-01-12",
      category: "Ürün Güncellemeleri",
      readTime: "3 dk okuma"
    },
    {
      id: "3",
      title: "Yapay Zeka Destekli Dijital Çalışanlar ile Müşteri Hizmetlerinizi Optimize Etmenin 5 Yolu",
      content: `
        <p>Müşteri hizmetleri, işletmelerin başarısında kritik rol oynayan bir alan. Yapay Zeka Destekli Dijital Çalışanlar, bu alanda devrim yaratarak hem müşteri memnuniyetini artırıyor hem de operasyonel maliyetleri düşürüyor.</p>
        
        <h2>1. Anında Yanıt Sistemi</h2>
        <p>7/24 çalışan Yapay Zeka Destekli Dijital Çalışanlar, müşteri sorularına anında yanıt vererek bekleme sürelerini sıfıra indiriyor. Bu, müşteri memnuniyetini önemli ölçüde artırıyor.</p>
        
        <h2>2. Kişiselleştirilmiş Deneyim</h2>
        <p>Müşteri geçmişini analiz eden dijital çalışanlar, her kullanıcıya özel çözümler sunarak deneyimi kişiselleştiriyor.</p>
        
        <h2>3. Çok Dilli Destek</h2>
        <p>Aynı anda onlarca dilde hizmet verebilen dijital çalışanlar, global müşteri tabanınıza daha iyi hizmet vermenizi sağlıyor.</p>
        
        <h2>4. Proaktif Destek</h2>
        <p>Potansiyel sorunları önceden tespit eden dijital çalışanlar, müşteriler sorun yaşamadan önlemler alıyor.</p>
        
        <h2>5. Sürekli Öğrenme</h2>
        <p>Her etkileşimden öğrenen dijital çalışanlar, zamanla daha da etkili hizmet sunmaya başlıyor.</p>
      `,
      author: "Emma Thompson",
      publishDate: "2024-01-10",
      category: "İpuçları ve Rehberler",
      readTime: "7 dk okuma"
    },
    {
      id: "4",
      title: "Vaka Çalışması: TechCorp Destek Biletlerini %60 Nasıl Azalttı",
      content: `
        <p>TechCorp, 500 çalışanlı bir teknoloji şirketi olarak, artan destek taleplerini karşılamakta zorlanıyordu. Nonplo'nun Yapay Zeka Destekli Dijital Çalışanları ile bu sorunu nasıl çözdüklerini inceleyelim.</p>
        
        <h2>Sorun</h2>
        <p>Günde 200+ destek bileti alan TechCorp, müşteri memnuniyetsizliği ve yüksek operasyonel maliyetlerle karşı karşıyaydı. Ortalama yanıt süresi 4 saat, çözüm süresi ise 24 saatti.</p>
        
        <h2>Çözüm</h2>
        <p>Nonplo ile oluşturulan Yapay Zeka Destekli Dijital Çalışanlar, yaygın soruları otomatik olarak çözmeye başladı. İlk seviye destek tamamen otomatize edildi.</p>
        
        <h2>Sonuçlar</h2>
        <ul>
          <li>Destek biletlerinde %60 azalma</li>
          <li>Ortalama yanıt süresi 30 saniyeye düştü</li>
          <li>Müşteri memnuniyeti %85'ten %95'e yükseldi</li>
          <li>Destek maliyetlerinde %40 tasarruf</li>
        </ul>
        
        <h2>Öğrenilen Dersler</h2>
        <p>Doğru yapılandırılmış Yapay Zeka Destekli Dijital Çalışanlar, hem müşteri deneyimini iyileştirir hem de operasyonel verimliliği artırır.</p>
      `,
      author: "David Park",
      publishDate: "2024-01-08",
      category: "İpuçları ve Rehberler",
      readTime: "6 dk okuma"
    },
    {
      id: "5",
      title: "Yapay Zeka Destekli İş Uygulamaları için Güvenlik En İyi Uygulamaları",
      content: `
        <p>Yapay Zeka Destekli Dijital Çalışanları iş süreçlerinize entegre ederken güvenlik, en kritik konulardan biri. Bu makalede, güvenli bir yapay zeka altyapısı oluşturmak için temel prensipleri ele alıyoruz.</p>
        
        <h2>Veri Şifreleme</h2>
        <p>Tüm veri transferleri end-to-end şifreleme ile korunmalı. Hem transit hem de depolama aşamasında AES-256 şifreleme standardı kullanılmalı.</p>
        
        <h2>Erişim Kontrolü</h2>
        <p>Role-based access control (RBAC) sistemi ile kullanıcı yetkileri sıkı şekilde kontrol edilmeli. Multi-factor authentication zorunlu hale getirilmeli.</p>
        
        <h2>Veri Minimizasyonu</h2>
        <p>Dijital Çalışanların sadece gerekli verilere erişim sağlaması ve gereksiz veri toplamaktan kaçınılması kritik.</p>
        
        <h2>Düzenli Güvenlik Denetimleri</h2>
        <p>Penetrasyon testleri ve güvenlik zafiyet taramaları düzenli olarak yapılmalı.</p>
        
        <h2>Compliance</h2>
        <p>GDPR, ISO 27001 gibi uluslararası standartlara uyum sağlanmalı.</p>
      `,
      author: "Lisa Wang",
      publishDate: "2024-01-05",
      category: "Sektör İçgörüleri",
      readTime: "8 dk okuma"
    },
    {
      id: "6",
      title: "Yeni Özellik: Gelişmiş Analitik Panosu",
      content: `
        <p>Nonplo'nun yeni analitik panosu ile dijital çalışan performansınızı daha detaylı şekilde takip edebilir ve optimize edebilirsiniz.</p>
        
        <h2>Gerçek Zamanlı Metrikler</h2>
        <p>Dijital Çalışan aktivitelerini gerçek zamanlı olarak izleyebilir, performans bottleneck'lerini anında tespit edebilirsiniz.</p>
        
        <h2>Detaylı Raporlama</h2>
        <p>Haftalık, aylık ve yıllık raporlar ile trend analizleri yapabilir, gelecek planlarınızı daha iyi yapabilirsiniz.</p>
        
        <h2>Özelleştirilebilir Dashboard</h2>
        <p>İhtiyacınıza göre dashboard'unuzu özelleştirerek en önemli metrikleri ön plana çıkarabilirsiniz.</p>
        
        <h2>Export Seçenekleri</h2>
        <p>Verilerinizi CSV, PDF ve Excel formatlarında dışa aktararak başka sistemlerle entegre edebilirsiniz.</p>
      `,
      author: "Alex Johnson",
      publishDate: "2024-01-03",
      category: "Ürün Güncellemeleri",
      readTime: "4 dk okuma"
    }
  ];

  const article = blogPosts.find(post => post.id === articleId);

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-bold mb-4">Blog yazısı bulunamadı</h1>
          <Link to="/resources/blog">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Blog'a Geri Dön
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Ürün Güncellemeleri":
        return "bg-primary/10 text-primary";
      case "İpuçları ve Rehberler":
        return "bg-green-500/10 text-green-700";
      case "Sektör İçgörüleri":
        return "bg-purple-500/10 text-purple-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link 
              to="/resources/blog" 
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Blog'a Geri Dön
            </Link>
          </div>

          {/* Article Header */}
          <header className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Badge className={getCategoryColor(article.category)}>
                {article.category}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {article.readTime}
              </div>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              {article.title}
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {article.author}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(article.publishDate).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </header>

          {/* Article Content */}
          <article className="prose prose-lg max-w-none">
            <div 
              className="text-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: article.content }}
              style={{
                lineHeight: '1.8',
              }}
            />
          </article>

          {/* Article Footer */}
          <footer className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {article.author} tarafından yazıldı • {new Date(article.publishDate).toLocaleDateString('tr-TR')}
              </div>
              <Link to="/resources/blog">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Tüm Blog Yazıları
                </Button>
              </Link>
            </div>
          </footer>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogArticle;