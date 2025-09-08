import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HeroSection from "@/components/sections/HeroSection";
import WhyNonploSection from "@/components/sections/WhyNonploSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import FAQSection from "@/components/sections/FAQSection";
import ContactSection from "@/components/sections/ContactSection";
import NewsletterSection from "@/components/sections/NewsletterSection";
import PricingSection from "@/components/sections/PricingSection";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AgentCreationWizard from "@/components/features/AgentCreationWizard";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    if (search.get("openWizard") === "1") {
      setWizardOpen(true);
      // Clean the URL
      navigate("/", { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <WhyNonploSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <ContactSection />
      <NewsletterSection />
      <FAQSection />
      <Footer />
      
      {/* Dijital Çalışan Oluşturma Sihirbazı */}
      <AgentCreationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </div>
  );
};

export default Index;