import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface TrainingRequestDialogProps {
  children: React.ReactNode;
}

export const TrainingRequestDialog = ({ children }: TrainingRequestDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_name: "",
    user_email: "",
    topic: "",
    description: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_email || !formData.topic) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen email ve konu alanlarını doldurun.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('training_requests')
        .insert({
          user_name: formData.user_name || null,
          user_email: formData.user_email,
          topic: formData.topic,
          description: formData.description || null
        });

      if (error) throw error;

      toast({
        title: "Başarılı!",
        description: "Eğitim talebiniz başarıyla gönderildi. En kısa sürede size dönüş yapacağız.",
      });

      // Reset form
      setFormData({
        user_name: "",
        user_email: "",
        topic: "",
        description: ""
      });

      setOpen(false);
    } catch (error) {
      console.error('Error submitting training request:', error);
      toast({
        title: "Hata",
        description: "Talebiniz gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Eğitim Talebi</DialogTitle>
          <DialogDescription>
            Hangi konuda eğitim videosu görmek istediğinizi bize bildirin. Sizin için özel içerik hazırlayalım.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user_name">İsim (İsteğe bağlı)</Label>
              <Input
                id="user_name"
                value={formData.user_name}
                onChange={(e) => handleInputChange("user_name", e.target.value)}
                placeholder="Adınız"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_email">Email *</Label>
              <Input
                id="user_email"
                type="email"
                required
                value={formData.user_email}
                onChange={(e) => handleInputChange("user_email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Eğitim Konusu *</Label>
            <Input
              id="topic"
              required
              value={formData.topic}
              onChange={(e) => handleInputChange("topic", e.target.value)}
              placeholder="Örn: Whatsapp Bot Entegrasyonu"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detaylı Açıklama (İsteğe bağlı)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Eğitim talebinizle ilgili daha detaylı bilgi verebilirsiniz..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Gönderiliyor..." : "Talep Gönder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
