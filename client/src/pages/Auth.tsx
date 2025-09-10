import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";

const Auth = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: ""
  });
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/";
  const mode = params.get("mode") || "signin";

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      console.log("🚀 User already logged in, redirecting to:", next);
      window.location.href = next;
    }
  }, [user, authLoading, next]);

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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google giriş hatası!",
        description: error.message || "Google ile giriş yapılırken bir hata oluştu.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Apple giriş hatası!",
        description: error.message || "Apple ile giriş yapılırken bir hata oluştu.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`
      });

      if (error) throw error;

      toast({
        title: "Şifre sıfırlama e-postası gönderildi!",
        description: "E-posta adresinizi kontrol edin ve bağlantıya tıklayarak şifrenizi sıfırlayın.",
      });
      
      setShowResetForm(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Şifre sıfırlama hatası!",
        description: error.message || "Şifre sıfırlama e-postası gönderilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Şifreler eşleşmiyor!",
        description: "Yeni şifre ve şifre tekrarı aynı olmalıdır.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Şifre çok kısa!",
        description: "Şifreniz en az 6 karakter olmalıdır.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Şifre başarıyla güncellendi!",
        description: "Yeni şifrenizle giriş yapabilirsiniz.",
      });
      
      // Redirect to signin mode
      window.location.href = "/auth?mode=signin";
    } catch (error: any) {
      toast({
        title: "Şifre güncelleme hatası!",
        description: error.message || "Şifre güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
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
            <CardTitle className="text-2xl text-foreground">
              {mode === "reset-password" ? "Şifre Sıfırlama" : "Hesap İşlemleri"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {mode === "reset-password" 
                ? "Yeni şifrenizi belirleyin ve hesabınıza güvenli bir şekilde giriş yapın" 
                : "Yapay Zeka Destekli Dijital Çalışan otomasyonu yolculuğunuza başlamak için giriş yapın"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "reset-password" ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-foreground flex items-center">
                    <Lock className="w-4 h-4 mr-2" />
                    Yeni Şifre
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="En az 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                    data-testid="input-new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-foreground flex items-center">
                    <Lock className="w-4 h-4 mr-2" />
                    Yeni Şifre Tekrar
                  </Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="Yeni şifrenizi tekrar girin"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                    data-testid="input-confirm-new-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Şifre güncelleniyor...
                    </>
                  ) : (
                    "Şifreyi Güncelle"
                  )}
                </Button>
              </form>
            ) : (
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

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">veya</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      data-testid="button-google-signin"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent"
                      onClick={handleAppleSignIn}
                      disabled={isLoading}
                      data-testid="button-apple-signin"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Apple
                    </Button>
                  </div>

                  <div className="text-center mt-4">
                    <button 
                      type="button"
                      onClick={() => setShowResetForm(!showResetForm)}
                      className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                      data-testid="button-forgot-password"
                    >
                      Şifremi Unuttum
                    </button>
                  </div>

                  {showResetForm && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <form onSubmit={handleForgotPassword} className="space-y-3">
                        <Label htmlFor="reset-email" className="text-sm font-medium">
                          E-posta Adresiniz
                        </Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="E-posta adresinizi girin"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          className="bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
                          data-testid="input-reset-email"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={isLoading || !resetEmail}
                            className="flex-1"
                            data-testid="button-send-reset"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Gönderiliyor...
                              </>
                            ) : (
                              "Sıfırlama Linki Gönder"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowResetForm(false);
                              setResetEmail("");
                            }}
                            data-testid="button-cancel-reset"
                          >
                            İptal
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
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

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">veya</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      data-testid="button-google-signup"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent"
                      onClick={handleAppleSignIn}
                      disabled={isLoading}
                      data-testid="button-apple-signup"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Apple
                    </Button>
                  </div>
                </form>
              </TabsContent>
              </Tabs>
            )}
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