import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Send, ArrowRight, Loader2 } from "lucide-react";

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
}

interface ContactFormDialogProps {
  children: React.ReactNode;
}

const ContactFormDialog = ({ children }: ContactFormDialogProps) => {
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
      toast({
        title: "Hata!",
        description: "Lütfen zorunlu alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    onSubmit(data);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto" data-testid="contact-form-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Size Nasıl Yardımcı Olabiliriz?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Formu doldurun, size 24 saat içinde dönüş yapalım.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-name" className="text-sm font-semibold text-foreground flex items-center">
                İsim Soyisim <span className="text-destructive ml-1">*</span>
              </Label>
              <Input 
                id="dialog-name" 
                type="text" 
                placeholder="Adınız soyadınız" 
                {...register("name", { required: "Ad soyad gereklidir" })}
                className="h-10 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300"
                data-testid="input-name" 
              />
              {errors.name && (
                <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialog-email" className="text-sm font-semibold text-foreground flex items-center">
                E-posta Adresi <span className="text-destructive ml-1">*</span>
              </Label>
              <Input 
                id="dialog-email" 
                type="email" 
                placeholder="ornek@email.com" 
                {...register("email", { 
                  required: "E-posta gereklidir",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Geçerli bir e-posta adresi girin"
                  }
                })}
                className="h-10 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300"
                data-testid="input-email" 
              />
              {errors.email && (
                <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-phone" className="text-sm font-semibold text-foreground">
                Telefon Numarası
              </Label>
              <Input 
                id="dialog-phone" 
                type="tel" 
                placeholder="+90 5xx xxx xx xx" 
                {...register("phone")}
                className="h-10 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300"
                data-testid="input-phone" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dialog-company" className="text-sm font-semibold text-foreground">
                Şirket Adı
              </Label>
              <Input 
                id="dialog-company" 
                type="text" 
                placeholder="Şirket adınız" 
                {...register("company")}
                className="h-10 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300"
                data-testid="input-company" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dialog-subject" className="text-sm font-semibold text-foreground">
              Konu
            </Label>
            <Input 
              id="dialog-subject" 
              type="text" 
              placeholder="Mesajınızın konusu" 
              {...register("subject")}
              className="h-12 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300"
              data-testid="input-subject" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dialog-message" className="text-sm font-semibold text-foreground flex items-center">
              Mesajınız <span className="text-destructive ml-1">*</span>
            </Label>
            <Textarea 
              id="dialog-message" 
              placeholder="İşletmeniz hakkında bilgi verin ve size nasıl yardımcı olabileceğimizi anlatın. Ne tür Yapay Zeka Destekli Dijital Çalışan çözümlerine ihtiyacınız var?" 
              {...register("message", { required: "Mesaj gereklidir" })}
              rows={3} 
              className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 resize-none transition-all duration-300"
              data-testid="textarea-message" 
            />
            {errors.message && (
              <p className="text-destructive text-sm mt-1">{errors.message.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            size="lg" 
            disabled={isSubmitting}
            className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transform hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-submit"
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
      </DialogContent>
    </Dialog>
  );
};

export default ContactFormDialog;