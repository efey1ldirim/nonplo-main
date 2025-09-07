import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const NewsletterSection = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email }]);

      if (error) {
        if (error.code === '23505') { // Unique violation
          toast({
            title: "Zaten kayıtlısınız!",
            description: "Bu e-posta adresi zaten bültenimize kayıtlı.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Başarıyla abone oldunuz!",
          description: "Bültenimize hoş geldiniz. Size en son güncellemeleri göndereceğiz.",
        });
        setEmail("");
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: "Hata!",
        description: "Abonelik işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 bg-gradient-to-r from-muted/30 to-muted/50">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Haberdar Olun
            </h2>
          </div>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Ürün güncellemeleri, iş otomasyonu ipuçları ve özel teklifler — doğrudan gelen kutunuza.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-4">
            <Input
              type="email"
              placeholder="E-posta adresinizi girin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-background border-border/50 text-center sm:text-left"
            />
            <Button 
              type="submit" 
              size="lg"
              disabled={isSubmitting}
              className="whitespace-nowrap hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Kaydediliyor..." : "Abone Ol"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            Gelen kutunuza saygı duyuyoruz. Asla spam göndermeyiz.
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
