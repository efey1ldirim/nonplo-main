import { Button } from "@/components/ui/button";
import PricingSection from "@/components/sections/PricingSection";
import FAQSection from "@/components/sections/FAQSection";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ContactFormDialog from "@/components/dialogs/ContactFormDialog";
import { Check, X, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Pricing = () => {
  const navigate = useNavigate();
  const features = [
    {
      name: "Çalışan Sayısı",
      basic: "1",
      pro: "5", 
      business: "10"
    },
    {
      name: "Aylık Request (Mesaj) Hakkı",
      basic: "4.000",
      pro: "10.000",
      business: "Premium"
    },
    {
      name: "Entegrasyon Erişimi",
      basic: "2 uygulama",
      pro: "Gelişmiş erişim",
      business: "Tam erişim"
    },
    {
      name: "Tool Erişimi",
      basic: "Temel",
      pro: "Gelişmiş",
      business: "Gelişmiş"
    },
    {
      name: "Analiz ve Raporlama",
      basic: "Temel",
      pro: "Gelişmiş",
      business: "Gelişmiş"
    },
    {
      name: "Şablonlar",
      basic: "Temel",
      pro: "Gelişmiş",
      business: "Gelişmiş"
    },
    {
      name: "Konuşma Kredisi",
      basic: false,
      pro: false,
      business: "1500 dk"
    },
    {
      name: "Özel Telefon Numarası",
      basic: false,
      pro: false,
      business: true
    },
    {
      name: "Destek",
      basic: "E-posta",
      pro: "E-posta",
      business: "Öncelikli"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Her İşletme İçin Esnek Planlar
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Ücretsiz başlayın, büyüdükçe yükseltin. Gizli ücret yok.
          </p>
          <Button variant="hero" size="lg" className="text-lg px-8 py-6">
            Ücretsiz Denemeyi Başlat
          </Button>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Trust Elements */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Kredi Kartı Gerekli Değil</h3>
              <p className="text-sm text-muted-foreground">
                Herhangi bir ödeme bilgisi olmadan ücretsiz denemenizi hemen başlatın
              </p>
            </div>
            <div>
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">İstediğiniz Zaman İptal Edin</h3>
              <p className="text-sm text-muted-foreground">
                Uzun vadeli sözleşme veya iptal ücreti yok. Büyüdükçe planınızı değiştirin
              </p>
            </div>
            <div>
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Güvenli Faturalandırma</h3>
              <p className="text-sm text-muted-foreground">
                Güvenli işlemler için Stripe tarafından desteklenen kurumsal düzeyde güvenlik
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Planları Karşılaştır
            </h2>
            <p className="text-xl text-muted-foreground">
              Her plana dahil olan özellikleri görün
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Özellikler</TableHead>
                    <TableHead className="text-center">Temel Plan</TableHead>
                    <TableHead className="text-center bg-primary/5 font-semibold relative">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                          ⭐ En Çok Tercih Edilen
                        </span>
                      </div>
                      Plus Plan
                    </TableHead>
                    <TableHead className="text-center">Premium Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{feature.name}</TableCell>
                      <TableCell className="text-center">
                        {typeof feature.basic === 'boolean' ? (
                          feature.basic ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          feature.basic
                        )}
                      </TableCell>
                      <TableCell className="text-center bg-primary/5">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          feature.pro
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {typeof feature.business === 'boolean' ? (
                          feature.business ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          feature.business
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </section>

      {/* Ekstra Krediler Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Ekstra Krediler
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Kullanıcılar paketlerindeki mesaj veya konuşma hakkını bitirdiğinde, dijital çalışanın aktif kalmaya devam etmesi için ekstra krediler satın alabilir. Böylece çalışanınız kesintisiz şekilde çalışmaya devam eder.
            </p>
          </div>

          {/* Ekstra Mesaj Kredileri */}
          <div className="mb-20">
            <h3 className="text-3xl font-bold text-foreground text-center mb-12">
              Ekstra Mesaj Kredileri
            </h3>
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
              {[
                { amount: "500", price: "100" },
                { amount: "1.000", price: "175" },
                { amount: "2.500", price: "400" },
                { amount: "5.000", price: "600" },
                { amount: "10.000", price: "1.000" }
              ].map((credit, index) => (
                <div key={index} className="bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-foreground mb-1">
                      {credit.amount}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Mesaj
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="text-2xl font-bold text-primary">
                      ₺{credit.price}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    data-testid={`button-buy-message-credit-${credit.amount.replace('.', '')}`}
                  >
                    Satın Al
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Ekstra Konuşma Kredileri */}
          <div>
            <h3 className="text-3xl font-bold text-foreground text-center mb-12">
              Ekstra Konuşma Kredileri
            </h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { amount: "100", price: "300" },
                { amount: "500", price: "1.250" },
                { amount: "1.000", price: "2.250" }
              ].map((credit, index) => (
                <div key={index} className="bg-card rounded-2xl p-8 border border-border shadow-card hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 text-center">
                  <div className="mb-6">
                    <div className="text-4xl font-bold text-foreground mb-2">
                      {credit.amount}
                    </div>
                    <div className="text-muted-foreground">
                      Dakika
                    </div>
                  </div>
                  <div className="mb-8">
                    <div className="text-3xl font-bold text-primary">
                      ₺{credit.price}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full text-base py-6 h-auto"
                    data-testid={`button-buy-call-credit-${credit.amount}`}
                  >
                    Kredi Yükle
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Hala sorularınız mı var?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Ekibimiz yapay zeka çalışanı oluşturmaya başlamanızda size yardımcı olmak için burada
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ContactFormDialog>
              <Button 
                variant="outline"
                size="lg"
                className="border border-primary/20 bg-background/50 text-primary hover:bg-primary hover:text-primary-foreground backdrop-blur-sm transition-all duration-300 hover:shadow-primary h-11 rounded-md px-8"
                data-testid="button-contact-support"
              >
                Destek İle İletişime Geç
              </Button>
            </ContactFormDialog>
            <Button 
              variant="hero" 
              size="lg" 
              data-testid="button-sales-team"
              onClick={() => window.open('tel:+905372028850', '_self')}
            >
              Satış Ekibiyle Konuş
            </Button>
          </div>
        </div>
      </section>


      {/* FAQ Section */}
      <FAQSection />

      <Footer />
    </div>
  );
};

export default Pricing;