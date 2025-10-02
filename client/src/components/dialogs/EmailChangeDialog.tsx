import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

interface EmailChangeDialogProps {
  children: React.ReactNode;
  currentEmail?: string;
}

const EmailChangeDialog = ({ children, currentEmail }: EmailChangeDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newEmail: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password verification mutation
  const verifyPasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string }) => 
      apiRequest("/api/verify-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: async () => {
      // Password verified, now update email via backend API with admin privileges
      try {
        const response = await apiRequest("/api/admin/change-email", {
          method: "POST",
          body: JSON.stringify({ newEmail: formData.newEmail }),
        });
        
        if (!response.success) {
          throw new Error(response.error || 'E-posta değiştirme başarısız');
        }
        
        toast({
          title: "E-posta değiştirildi!",
          description: "E-posta adresiniz başarıyla güncellendi. Yeni e-posta adresinizi doğrulamanız gerekebilir.",
        });
        
        // Refresh user session to update UI with new email
        await supabase.auth.refreshSession();
        
        // Force page reload to update all user data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        setIsOpen(false);
        resetForm();
      } catch (error: any) {
        toast({
          title: "E-posta değiştirme hatası!",
          description: error.message || "E-posta değiştirilirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Şifre doğrulama hatası!",
        description: error.message || "Şifre doğrulanırken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      currentPassword: "",
      newEmail: ""
    });
    setErrors({});
    setShowPassword(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Mevcut şifrenizi girin";
    }

    if (!formData.newEmail) {
      newErrors.newEmail = "Yeni e-posta adresinizi girin";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.newEmail)) {
      newErrors.newEmail = "Geçerli bir e-posta adresi girin";
    } else if (formData.newEmail === currentEmail) {
      newErrors.newEmail = "Yeni e-posta mevcut e-postanızdan farklı olmalıdır";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    verifyPasswordMutation.mutate({
      currentPassword: formData.currentPassword,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            E-posta Adresi Değiştir
          </DialogTitle>
          <DialogDescription>
            Yeni e-posta adresinizi girin ve şifreniz ile onaylayın.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Email Display */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Mevcut E-posta</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {currentEmail || "Yükleniyor..."}
            </div>
          </div>

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Mevcut Şifre</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPassword ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                placeholder="Mevcut şifrenizi girin"
                className={errors.currentPassword ? "border-destructive" : ""}
                data-testid="input-current-password-email"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password-email"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Email */}
          <div className="space-y-2">
            <Label htmlFor="newEmail">Yeni E-posta Adresi</Label>
            <Input
              id="newEmail"
              type="email"
              value={formData.newEmail}
              onChange={(e) => handleInputChange("newEmail", e.target.value)}
              placeholder="yeni@email.com"
              className={errors.newEmail ? "border-destructive" : ""}
              data-testid="input-new-email"
            />
            {errors.newEmail && (
              <p className="text-sm text-destructive">{errors.newEmail}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              data-testid="button-cancel-email-change"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={verifyPasswordMutation.isPending}
              className="flex-1"
              data-testid="button-submit-email-change"
            >
              {verifyPasswordMutation.isPending ? "Değiştiriliyor..." : "E-posta Değiştir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailChangeDialog;