import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import { Mail, Phone, MapPin, Send, Calendar, MessageSquare, Clock, ArrowRight, Sparkles, Loader2 } from "lucide-react";

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
}

const ContactSection = () => {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    console.log('Form submission started with data:', data);
    try {
      console.log('Sending email to backend...');
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      console.log('Backend response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      console.log('Email sent successfully');
      toast({
        title: "Mesaj Gönderildi!",
        description: result.message || "Mesajınız başarıyla gönderildi. Size 24 saat içinde dönüş yapacağız.",
      });

      reset();
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Hata!",
        description: error instanceof Error ? error.message : "Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = (data: ContactFormData) => {
    // Check for required fields
    if (!data.name || !data.email || !data.message) {
      alert("Lütfen zorunlu alanları doldurun");
      return;
    }

    onSubmit(data);
  };

  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-primary/5"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl opacity-40"></div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/20">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Size Nasıl <span className="text-primary">Yardımcı</span> Olabiliriz?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Yapay Zeka Destekli Dijital Çalışanlar ile işletmenizi dönüştürmeye hazır mısınız? Sorularınızı yanıtlamak ve başarı yolculuğunuzda size rehberlik etmek için buradayız.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Contact Form - Full Width */}
          <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl mb-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Hemen Başlayalım
              </h3>
              <p className="text-muted-foreground">
                Formu doldurun, size 24 saat içinde dönüş yapalım.
              </p>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              {/* Top Row - Name, Email, Phone, Company */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-foreground flex items-center">
                    İsim Soyisim <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="Adınız soyadınız" 
                    {...register("name", { required: "Ad soyad gereklidir" })}
                    className="h-12 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300" 
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground flex items-center">
                    E-posta Adresi <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="ornek@email.com" 
                    {...register("email", { 
                      required: "E-posta gereklidir",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Geçerli bir e-posta adresi girin"
                      }
                    })}
                    className="h-12 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300" 
                  />
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                    Telefon Numarası
                  </Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+90 5xx xxx xx xx" 
                    {...register("phone")}
                    className="h-12 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300" 
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="company" className="text-sm font-semibold text-foreground">
                    Şirket Adı
                  </Label>
                  <Input 
                    id="company" 
                    type="text" 
                    placeholder="Şirket adınız" 
                    {...register("company")}
                    className="h-12 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300" 
                  />
                </div>
              </div>

              {/* Second Row - Subject */}
              <div className="space-y-3">
                <Label htmlFor="subject" className="text-sm font-semibold text-foreground">
                  Konu
                </Label>
                <Input 
                  id="subject" 
                  type="text" 
                  placeholder="Mesajınızın konusu" 
                  {...register("subject")}
                  className="h-12 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300" 
                />
              </div>

              {/* Third Row - Message */}
              <div className="space-y-3">
                <Label htmlFor="message" className="text-sm font-semibold text-foreground flex items-center">
                  Mesajınız <span className="text-destructive ml-1">*</span>
                </Label>
                <Textarea 
                  id="message" 
                  placeholder="İşletmeniz hakkında bilgi verin ve size nasıl yardımcı olabileceğimizi anlatın. Ne tür Yapay Zeka Destekli Dijital Çalışan çözümlerine ihtiyacınız var?" 
                  {...register("message", { required: "Mesaj gereklidir" })}
                  rows={3} 
                  className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 resize-none transition-all duration-300" 
                />
                {errors.message && (
                  <p className="text-destructive text-sm mt-1">{errors.message.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                size="lg" 
                disabled={isSubmitting}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-3" />
                    Mesajı Gönder
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Contact Info Below Form - Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">E-posta</h4>
              <p className="text-primary hover:text-primary/80 transition-colors text-sm mb-1">contact@nonplo.com</p>
              <p className="text-xs text-muted-foreground">
                7/24 destek için
              </p>
            </div>

            <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Canlı Destek</h4>
              <p className="text-muted-foreground text-sm mb-1">Web sitemizde aktif</p>
              <p className="text-xs text-muted-foreground">
                Pazartesi-Cuma, 09:00-18:00
              </p>
            </div>

            <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Yanıt Süresi</h4>
              <p className="text-muted-foreground text-sm mb-1">24 saat içinde</p>
              <p className="text-xs text-muted-foreground">
                Hızlı ve detaylı yanıt garantisi
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;