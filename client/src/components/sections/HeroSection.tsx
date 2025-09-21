import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Zap, Clock, Users } from "lucide-react";
import { useStartAgentCreation } from "@/hooks/use-start-agent-creation";
import aiAgentHero from "@/assets/ai-agent-hero.png";
const HeroSection = () => {
  const { start, busy } = useStartAgentCreation();
  return <section className="min-h-screen bg-gradient-subtle relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />

      <div className="container mx-auto px-4 pt-16 pb-8 relative z-10">
        <div className="flex items-center justify-center min-h-[80vh]">

          {/* Centered content */}
          <div className="text-center animate-fade-in max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6 shadow-card">
              <Zap className="w-4 h-4 text-primary" />
              Kod Bilgisi Gerekmez
            </div>

            {/* Main headline */}
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Dijital çalışanınız.{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Kodlama bilgisi gerekmez.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">Müşteri desteği, potansiyel müşteri değerlendirme ve rutin görevleri yöneten kişiselleştirilmiş yapay zeka çalışanları oluşturun.</p>

            {/* Stats */}
            <div className="flex gap-6 mb-12 justify-center">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Dakikalar içinde kurulum</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">+100 çalışan</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                data-testid="cta-start-agent"
                aria-label="Dijital Çalışan Oluşturmayı Başlat"
                variant="hero"
                size="lg"
                className="text-lg px-8 py-6 h-auto rounded-full hover:shadow-glow hover:scale-105 transition-all duration-300"
                onClick={() => start({ afterSuccessRedirect: "/dashboard/agents" })}
                disabled={busy}
              >
                {busy ? (
                  <>Açılıyor...</>
                ) : (
                  <>
                    Çalışanını oluşturmaya hemen başla
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto rounded-full">
                <Play className="w-5 h-5 mr-2" />
                Demo İzle
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="text-sm text-muted-foreground">✨ 7 günlük ücretsiz deneme </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>;
};
export default HeroSection;