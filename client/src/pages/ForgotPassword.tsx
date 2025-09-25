import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "E-posta gönderildi!",
        description: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.",
      });
    } catch (error: any) {
      toast({
        title: "Hata!",
        description: error.message || "Şifre sıfırlama e-postası gönderilemedi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Şifre Sıfırlama</h1>
          <p className="text-muted-foreground">
            E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim
          </p>
        </div>

        <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground flex items-center justify-center gap-2">
              <Mail className="w-6 h-6" />
              Şifremi Unuttum
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Kayıtlı e-posta adresinizi girin
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-foreground flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    E-posta Adresi
                  </Label>
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                    data-testid="input-reset-email"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  disabled={isLoading || !email}
                  data-testid="button-reset-password"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Şifre Sıfırlama Bağlantısı Gönder
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    E-posta gönderildi!
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>{email}</strong> adresine şifre sıfırlama bağlantısı gönderdik.
                    E-postanızı kontrol edin ve bağlantıya tıklayarak şifrenizi sıfırlayın.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    E-posta gelmedi mi? Spam klasörünüzü kontrol edin veya birkaç dakika bekleyin.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link 
                to="/auth" 
                className="inline-flex items-center text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                data-testid="link-back-to-login"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Giriş sayfasına dön
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link to="/auth?mode=signup" className="text-primary hover:underline">
              Kayıt olun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;