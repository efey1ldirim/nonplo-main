import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { PRICING_PLANS } from "@/constants/pricing";
const PricingSection = () => {
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  const plans = PRICING_PLANS;
  return <section className="py-20 bg-background relative" id="pricing">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Planınızı Seçin
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            İşletmenizle birlikte büyüyen şeffaf fiyatlandırma. Ücretsiz başlayın, hazır olduğunuzda yükseltin.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => <div key={index} className={`relative bg-card rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-1 flex flex-col h-full ${plan.popular ? "border-primary shadow-primary/20 shadow-lg scale-105" : "border-border shadow-card hover:shadow-primary/10"}`}>
              {/* Popular badge */}
              {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                    <Star className="w-5 h-5" />
                    En Çok Tercih Edilen
                  </div>
                </div>}

              {/* Plan header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      ₺{plan.price.toLocaleString('tr-TR')}
                    </span>
                    <span className="text-muted-foreground">
                      /ay
                    </span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="flex-1 mb-8">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => <li key={featureIndex} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>)}
                </ul>
              </div>

              {/* CTA button */}
              <Button variant={plan.popular ? "hero" : "outline"} className="w-full text-base py-6 h-auto mt-auto">
                {plan.cta}
              </Button>
            </div>)}
        </div>

        {/* Custom plan section */}
        <div className="text-center mt-16">

        </div>
      </div>
    </section>;
};
export default PricingSection;
