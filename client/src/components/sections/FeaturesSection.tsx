import { Puzzle, Sparkles, MessageSquare, LayoutDashboard, Palette, Shield } from "lucide-react";
const FeaturesSection = () => {
  const features = [{
    icon: Puzzle,
    title: "Kod Olmadan Oluşturun",
    description: "Kurulum sihirbazımızla işinize özel yapay zeka çalışanları oluşturun. Teknik bilgiye ihtiyaç yok, sadece basit birkaç soruyu cevapla ve çalışanın hazır!"
  }, {
    icon: Sparkles,
    title: "Hazır Şablonlar",
    description: "Müşteri desteği, potansiyel müşteri değerlendirme ve yaygın iş görevleri için önceden oluşturulmuş şablonlarla anında başlayın."
  }, {
    icon: MessageSquare,
    title: "Akıllı Otomasyon",
    description: "E-posta yanıtları, sohbet desteği, randevu alma ve takip işlemlerini otomatikleştirin. Yapay Zeka Destekli Dijital Çalışanınız 7/24 çalışır."
  }, {
    icon: LayoutDashboard,
    title: "Birleşik Kontrol Paneli",
    description: "Tüm Yapay Zeka Destekli Dijital Çalışanlarınızı tek bir merkezi kontrol panelinden izleyin, yönetin ve optimize edin. Performans ve sonuçları takip edin."
  }, {
    icon: Palette,
    title: "Özel Kişilikler",
    description: "Dijital Çalışanlarınızı marka sesinize ve iş süreçlerinize uyacak şekilde eğitin. Kurallar, yanıtlar ve iş akışları belirleyin."
  }, {
    icon: Shield,
    title: "Kurumsal Güvenlik",
    description: "GDPR ve KVKK uyumlu veri işleme. İş bilgileriniz güvenli ve özel kalır."
  }];
  return <section className="py-20 bg-muted/30 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">

      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Nonplo Neler Yapabilir?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            İşletmenizin büyümesine yardımcı olan dijital çalışanları oluşturmak, dağıtmak ve yönetmek için ihtiyacınız olan her şey
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => <div key={index} className="group bg-background rounded-2xl p-8 shadow-card hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-2 border border-border/50 relative overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110">
                    <feature.icon className="w-7 h-7 text-primary group-hover:text-current transition-colors duration-300" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>)}
        </div>

      </div>
    </section>;
};
export default FeaturesSection;
