import { Code2, Clock, Building2, Zap } from "lucide-react";
const WhyNonploSection = () => {
  const benefits = [{
    icon: Code2,
    title: "Kodlama Gerekmez",
    description: "Kurulum sihirbazımızla güçlü yapay zeka çalışanları oluşturun. Teknik bilgiye gerek yok!"
  }, {
    icon: Clock,
    title: "Zaman Tasarrufu & Maliyet Azaltma",
    description: "Rutin görevleri otomatikleştirin ve personel iş yükünü azaltın. Geliştirici ücretlerinden binlerce lira tasarruf edin."
  }, {
    icon: Building2,
    title: "İşletmenizin ihtiyaçları için tasarlandı",
    description: "Basit fiyatlandırma, kolay kurulum ve büyüyen işletmeler için özel olarak tasarlanmış özellikler."
  }, {
    icon: Zap,
    title: "Hızlı Kurulum, Gerçek Sonuçlar",
    description: "Yapay zeka destekli dijital çalışanınızı dakikalar içinde devreye alın ve hemen sonuç görmeye başlayın. Uzun uygulama süreci yok."
  }];
  return <section className="py-20 bg-background relative">
      {/* Subtle pattern background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23A855F7' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Neden Nonplo?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Karmaşıklık olmadan yapay zeka sonuçları isteyen işletme sahipleri için akıllı seçim</p>
        </div>

        {/* Benefits grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => <div key={index} className="group bg-card rounded-2xl p-8 shadow-card hover:shadow-primary transition-all duration-300 hover:-translate-y-1 border border-border/50">
              {/* Icon */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <benefit.icon className="w-8 h-8 text-primary group-hover:text-current" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>)}
        </div>

        {/* Bottom CTA section */}

      </div>
    </section>;
};
export default WhyNonploSection;
