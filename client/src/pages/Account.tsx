import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  CreditCard, 
  Settings, 
  Crown, 
  Calendar, 
  Mail, 
  Phone, 
  Building,
  LogOut,
  Shield,
  Bell,
  Check,
  Star
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PasswordChangeDialog from "@/components/dialogs/PasswordChangeDialog";
import EmailChangeDialog from "@/components/dialogs/EmailChangeDialog";

const Account = () => {
  const { toast } = useToast();
  const { user, loading, signOut } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    company: ""
  });
  const [currentPlan] = useState("free"); // This would come from subscription status

  // Fetch notification settings
  const { data: notificationSettings, isLoading: notificationLoading } = useQuery({
    queryKey: ["/api/notification-settings", user?.id],
    queryFn: () => fetch(`/api/notification-settings?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Update notification settings mutation
  const updateNotificationMutation = useMutation({
    mutationFn: (updates: any) => apiRequest("/api/notification-settings", {
      method: "PATCH",
      body: JSON.stringify({ ...updates, userId: user?.id }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings", user?.id] });
      toast({
        title: "Ayarlar güncellendi!",
        description: "Bildirim tercihleriniz başarıyla kaydedildi.",
      });
    },
    onError: () => {
      toast({
        title: "Güncelleme hatası!",
        description: "Bildirim ayarları güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    },
  });



  const plans = [
    {
      name: "Temel Plan",
      description: "Küçük işletmeler için başlangıç seviyesi Yapay Zeka Destekli Dijital Çalışan çözümü",
      price: 3500,
      originalPrice: 2000,
      features: ["Tek bir çalışan hakkı", "2 uygulama ile entegrasyon", "Temel toollara erişim", "4000 request (mesaj) hakkı", "Dashboard erişimi", "Temel analiz bilgileri", "Temel şablonlar", "E-posta desteği"],
      popular: false,
      plan: "basic"
    },
    {
      name: "Plus Plan", 
      description: "Büyüyen işletmeler için en çok tercih edilen çözüm",
      price: 6500,
      originalPrice: 5000,
      features: ["5 çalışan hakkı", "Gelişmiş entegrasyon erişimi", "Gelişmiş toollara erişim", "10000 request (mesaj) hakkı", "Gelişmiş analiz ve raporlama", "Gelişmiş şablonlar", "Temel plandaki tüm özellikler"],
      popular: true,
      plan: "plus"
    },
    {
      name: "Premium Plan",
      description: "Kurumsal işletmeler için tam donanımlı premium çözüm",
      price: 12000,
      originalPrice: 10500,
      features: ["10 çalışan hakkı", "Entegrasyonlara tam erişim", "1500 dk konuşma kredisi", "İşletmeye özel telefon numarası", "Plus plandaki tüm özellikler", "Öncelikli destek"],
      popular: false,
      plan: "premium"
    }
  ];

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || "",
        company: user.user_metadata?.company || ""
      });
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      
      toast({
        title: "Başarıyla çıkış yapıldı!",
        description: "Ana sayfaya yönlendiriliyorsunuz.",
      });
      
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Çıkış hatası!",
        description: "Çıkış yapılırken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const updateProfile = async () => {
    try {
      // For now, just show success message
      // In production, you'd update the user profile via API
      toast({
        title: "Profil güncellendi!",
        description: "Bilgileriniz başarıyla kaydedildi.",
      });
    } catch (error: any) {
      toast({
        title: "Güncelleme hatası!",
        description: error.message || "Profil güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Hesap bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 pt-32">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Hesap Ayarları</h1>
              <p className="text-muted-foreground">
                Profilinizi ve abonelik bilgilerinizi yönetin
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </Button>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Abonelik
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Ödeme
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Ayarlar
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Kişisel Bilgiler
                  </CardTitle>
                  <CardDescription>
                    Hesap bilgilerinizi güncelleyin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Ad Soyad
                      </Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          full_name: e.target.value
                        })}
                        placeholder="Adınız ve soyadınız"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        E-posta Adresi
                      </Label>
                      <Input
                        id="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <EmailChangeDialog currentEmail={user?.email}>
                        <button className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors cursor-pointer">
                          E-posta adresini değiştirmek için buraya tıklayın
                        </button>
                      </EmailChangeDialog>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefon Numarası
                      </Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          phone: e.target.value
                        })}
                        placeholder="+90 5xx xxx xx xx"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company" className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Şirket
                      </Label>
                      <Input
                        id="company"
                        value={profileData.company}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          company: e.target.value
                        })}
                        placeholder="Şirket adınız"
                      />
                    </div>
                  </div>

                  <Button onClick={updateProfile} className="w-full md:w-auto">
                    Bilgileri Güncelle
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Abonelik Durumu
                  </CardTitle>
                  <CardDescription>
                    Mevcut aboneliğinizi ve kullanım detaylarınızı görün
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Crown className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Ücretsiz Plan</h3>
                        <p className="text-sm text-muted-foreground">
                          Temel özellikler ile başlayın
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Aktif</Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary mb-1">1</div>
                        <p className="text-sm text-muted-foreground">Yapay Zeka Destekli Dijital Çalışan</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary mb-1">100</div>
                        <p className="text-sm text-muted-foreground">Aylık Konuşma</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary mb-1">7</div>
                        <p className="text-sm text-muted-foreground">Gün Deneme</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          Plana Yükselt
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-center text-2xl font-bold">
                            Planınızı Seçin
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="grid md:grid-cols-3 gap-6 mt-6">
                          {plans.map((plan, index) => (
                            <div
                              key={index}
                              className={`relative bg-card rounded-2xl p-6 border transition-all duration-300 flex flex-col h-full ${
                                plan.popular
                                  ? "border-primary shadow-primary/20 shadow-lg scale-105"
                                  : "border-border shadow-card"
                              } ${
                                currentPlan === plan.plan
                                  ? "ring-2 ring-primary"
                                  : ""
                              }`}
                            >
                              {/* Current Plan Badge */}
                              {currentPlan === plan.plan && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                                    Mevcut Planın Bu
                                  </div>
                                </div>
                              )}

                              {/* Popular badge */}
                              {plan.popular && currentPlan !== plan.plan && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                                    <Star className="w-4 h-4" />
                                    En Çok Tercih Edilen
                                  </div>
                                </div>
                              )}

                              {/* Plan header */}
                              <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-foreground mb-2">
                                  {plan.name}
                                </h3>
                                <p className="text-muted-foreground mb-4 text-sm">
                                  {plan.description}
                                </p>

                                {/* Price */}
                                <div className="mb-4">
                                  <div className="flex items-baseline justify-center gap-1">
                                    <>
                                      <span className="text-3xl font-bold text-foreground">
                                        ₺{plan.price.toLocaleString('tr-TR')}
                                      </span>
                                      <span className="text-muted-foreground">
                                        /ay
                                      </span>
                                    </>
                                  </div>

                                </div>
                              </div>

                              {/* Features */}
                              <div className="flex-1 mb-6">
                                <ul className="space-y-2">
                                  {plan.features.map((feature, featureIndex) => (
                                    <li key={featureIndex} className="flex items-center gap-2 text-sm">
                                      <div className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Check className="w-2.5 h-2.5 text-primary" />
                                      </div>
                                      <span className="text-foreground">{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* CTA button */}
                              <Button 
                                variant={currentPlan === plan.plan ? "outline" : (plan.popular ? "default" : "outline")} 
                                className="w-full text-sm py-5 h-auto mt-auto"
                                disabled={currentPlan === plan.plan}
                              >
                                {currentPlan === plan.plan ? "Mevcut Plan" : 
                                 plan.plan === "basic" ? "Temel Planı Seç" : 
                                 plan.plan === "plus" ? "Plus Planı Seç" : "Premium Planı Seç"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = '/pricing'}
                    >
                      Tüm Planları Görüntüle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Ödeme Bilgileri
                  </CardTitle>
                  <CardDescription>
                    Ödeme yöntemlerinizi ve fatura geçmişinizi yönetin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">
                      Henüz ödeme yöntemi eklenmedi
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Ücretli plana geçmek için ödeme yöntemi ekleyin
                    </p>
                    <Button variant="outline">
                      Ödeme Yöntemi Ekle
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold text-foreground mb-4">Fatura Geçmişi</h4>
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-8 h-8 mx-auto mb-2" />
                      <p>Henüz fatura bulunmuyor</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Bildirim Ayarları
                    </CardTitle>
                    <CardDescription>
                      E-posta ve bildirim tercihlerinizi yönetin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {notificationLoading ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                            <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                          </div>
                          <div className="h-6 w-10 bg-muted animate-pulse rounded-full" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                            <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                          </div>
                          <div className="h-6 w-10 bg-muted animate-pulse rounded-full" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">E-posta Bildirimleri</h4>
                            <p className="text-sm text-muted-foreground">
                              Önemli güncellemeler ve duyurular
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings?.emailNotifications ?? true}
                            onCheckedChange={(checked) => {
                              updateNotificationMutation.mutate({ emailNotifications: checked });
                            }}
                            disabled={updateNotificationMutation.isPending}
                            data-testid="switch-email-notifications"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Pazarlama E-postaları</h4>
                            <p className="text-sm text-muted-foreground">
                              Yeni özellikler ve promosyonlar
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings?.marketingEmails ?? true}
                            onCheckedChange={(checked) => {
                              updateNotificationMutation.mutate({ marketingEmails: checked });
                            }}
                            disabled={updateNotificationMutation.isPending}
                            data-testid="switch-marketing-emails"
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Güvenlik
                    </CardTitle>
                    <CardDescription>
                      Hesap güvenliği ve şifre ayarları
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <PasswordChangeDialog>
                      <Button variant="outline" className="w-full" data-testid="button-change-password">
                        Şifre Değiştir
                      </Button>
                    </PasswordChangeDialog>
                    <EmailChangeDialog currentEmail={user?.email}>
                      <Button variant="outline" className="w-full" data-testid="button-change-email">
                        E-posta Adresi Değiştir
                      </Button>
                    </EmailChangeDialog>
                  </CardContent>
                </Card>

                <Card className="border-destructive/20">
                  <CardHeader>
                    <CardTitle className="text-destructive">Hesap Silme</CardTitle>
                    <CardDescription>
                      Hesabınızı 30 gün süreyle devre dışı bırakın. Bu süre içinde geri aktifleştirebilirsiniz.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <Shield className="h-5 w-5 text-yellow-500" />
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">
                              30 Günlük Koruma Sistemi
                            </p>
                            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                              Hesabınız devre dışı bırakılır ancak verileriniz 30 gün boyunca korunur. İstediğiniz zaman geri dönebilirsiniz.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => window.location.href = '/account/deletion'}
                        data-testid="button-delete-account"
                      >
                        Hesap Silme İşlemini Başlat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Account;