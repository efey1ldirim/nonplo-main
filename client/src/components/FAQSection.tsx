import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import ContactFormDialog from "@/components/ContactFormDialog";
import { MessageCircle } from "lucide-react";

const faqs = [
  {
    question: "Nonplo Nedir?",
    answer:
      "Nonplo, işletmelerin hiçbir teknik bilgiye ihtiyaç duymadan dakikalar içinde kendi yapay zeka destekli “dijital çalışanlarını” (AI agent) oluşturabilmelerini sağlayan bir SaaS platformudur. Bu dijital çalışanlar müşteri desteği, randevu takibi, satış süreçleri gibi birçok işi sizin yerinize yapar.",
  },
  {
    question: "Bir yapay zeka çalışanı ne tür görevleri yerine getirebilir?",
    answer:
      "Yapay zeka çalışanları müşteri desteği, potansiyel müşteri değerlendirme, e-posta otomasyonu, randevu planlama ve veri girişinde mükemmeldir. Temel olarak, bir kalıbı takip eden herhangi bir tekrarlayan görev otomatikleştirilebilir. Her çalışan işletme tarzınızı öğrenir ve buna göre yanıt verir.",
  },
  {
    question: "Nonplo’yu kullanmak için teknik bilgiye ihtiyacım var mı?",
    answer:
      "Hayır. Nonplo işletme sahipleri düşünülerek tasarlanmış tamamen no-code bir yapıya sahiptir. Basit bir kurulum sihirbazı ile birkaç soruyu yanıtlayarak kendi dijital çalışanınızı dakikalar içinde oluşturabilirsiniz.",
  },
  {
    question:
      "Nonplo ile oluşturduğum dijital çalışanı özelleştirebilir miyim?",
    answer:
      "Evet. Dijital çalışanınızın ismini, konuşma tarzını, görevlerini ve entegre olduğu platformları tamamen kendi işletmenize göre uyarlayabilirsiniz.",
  },
  {
    question: "Aboneliğimi iptal edersem ne olur?",
    answer:
      "Hiçbir sorun yok, gizli ücret yok. Kontrol panelinizden istediğiniz zaman iptal edebilirsiniz. Çalışanlarınız fatura döneminizin sonuna kadar çalışmaya devam edecek ve tüm verilerinizi dışa aktarabilirsiniz.",
  },
  {
    question: "Nonplo'yu ücretsiz deneyebilir miyim?",
    answer:
      "Evet! Tüm özelliklere tam erişimli 7 günlük ücretsiz deneme sunuyoruz. Sadece Nonplo'nun işletmeniz için çalıştığından emin olduğunuzda yükseltin.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Sık Sorulan Sorular
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Yapay zeka çalışanı oluşturmaya başlamak için bilmeniz gereken her
            şey
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border/50 rounded-lg px-6 py-2 bg-card/50 hover:bg-card/80 transition-colors"
              >
                <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pt-2 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="text-center mt-12 p-8 bg-muted/30 rounded-lg">
            <MessageCircle className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Hala sorularınız mı var?
            </h3>
            <p className="text-muted-foreground mb-6">
              Ekibimiz yapay zeka çalışanı oluşturmaya başlamanızda size
              yardımcı olmak için burada
            </p>
            <ContactFormDialog>
              <Button
                variant="outline"
                size="lg"
                className="hover:scale-105"
                data-testid="button-faq-contact-support"
              >
                Destek İle İletişime Geç
              </Button>
            </ContactFormDialog>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
