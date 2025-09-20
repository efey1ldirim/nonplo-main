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
import AgentWizardModal from "@/components/wizard/AgentWizardModal";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [newWizardOpen, setNewWizardOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    if (search.get("openNewWizard") === "1") {
      setNewWizardOpen(true);
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
      <AgentWizardModal
        isOpen={newWizardOpen}
        onClose={() => setNewWizardOpen(false)}
        onSuccess={(agentId: string) => {
          setNewWizardOpen(false);
          toast({
            title: "Başarılı!",
            description: "Dijital çalışanınız başarıyla oluşturuldu",
          });
          // Navigate to agent detail page
          navigate(`/dashboard/agents/${agentId}`);
        }}
      />
    </div>
  );
};

export default Index;