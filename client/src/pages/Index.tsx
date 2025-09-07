import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import WhyNonploSection from "@/components/WhyNonploSection";
import FeaturesSection from "@/components/FeaturesSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import ContactSection from "@/components/ContactSection";
import NewsletterSection from "@/components/NewsletterSection";
import PricingSection from "@/components/PricingSection";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AgentCreationWizard from "@/components/AgentCreationWizard";

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