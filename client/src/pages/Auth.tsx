import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";

const Auth = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: ""
  });
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/";
  const mode = params.get("mode") || "signin";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Başarıyla giriş yapıldı!",
          description: "Yönlendiriliyorsunuz...",
        });
        // Loading state'i açık bırak - sayfa yenileniyor
        window.location.href = next;
        return; // Early return - loading state devam etsin
      }
    } catch (error: any) {
      toast({
        title: "Giriş hatası!",
        description: error.message || "Giriş yapılırken bir hata oluştu.",
        variant: "destructive",
      });
      // Sadece hata durumunda loading'i kapat
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Hata!",
        description: "Şifreler eşleşmiyor.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Hata!",
        description: "Şifre en az 6 karakter olmalıdır.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}${next ? `/auth?next=${encodeURIComponent(next)}` : '/'}`;

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Kayıt başarılı!",
        description: "E-postanızı kontrol edin ve hesabınızı doğrulayın.",
      });
      // Kayıt başarılı - loading state'i açık bırak
      // Kullanıcı email doğrulama yapacak
    } catch (error: any) {
      toast({
        title: "Kayıt hatası!",
        description: error.message || "Kayıt olurken bir hata oluştu.",
        variant: "destructive",
      });
      // Sadece hata durumunda loading'i kapat
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Nonplo'ya Hoş Geldiniz</h1>
          <p className="text-muted-foreground">Hesabınıza giriş yapın veya yeni hesap oluşturun</p>
        </div>

        <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Hesap İşlemleri</CardTitle>
            <CardDescription className="text-muted-foreground">
              Yapay Zeka Destekli Dijital Çalışan otomasyonu yolculuğunuza başlamak için giriş yapın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={mode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Giriş Yap</TabsTrigger>
                <TabsTrigger value="signup">Kayıt Ol</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-foreground flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      E-posta Adresi
                    </Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="ornek@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-foreground flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Şifre
                    </Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Şifrenizi girin"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    disabled={isLoading}
                    data-testid="button-signin"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Giriş yapılıyor...
                      </>
                    ) : (
                      "Giriş Yap"
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <a 
                      href="/forgot-password" 
                      className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                      Şifremi Unuttum
                    </a>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-foreground flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Ad Soyad
                    </Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Adınız Soyadınız"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      E-posta Adresi
                    </Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="ornek@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Şifre
                    </Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="En az 6 karakter"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-foreground flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Şifre Tekrar
                    </Label>
                    <Input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type="password"
                      placeholder="Şifrenizi tekrar girin"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    disabled={isLoading}
                    data-testid="button-signup"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Kayıt olunuyor...
                      </>
                    ) : (
                      "Kayıt Ol"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Hesap oluşturarak{" "}
            <a href="/terms-of-service" className="text-primary hover:underline">Kullanım Şartlarını</a>
            {" "}ve{" "}
            <a href="/privacy-policy" className="text-primary hover:underline">Gizlilik Politikasını</a>
            {" "}kabul etmiş olursunuz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;