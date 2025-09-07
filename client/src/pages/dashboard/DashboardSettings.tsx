import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, Shield, Bell, Database } from "lucide-react";

const DashboardSettings = () => {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Ayarlar
          </h1>
        </div>
        <p className="text-muted-foreground text-base md:text-lg">
          Hesap ayarlarınızı ve tercihlerinizi yönetin
        </p>
      </div>

      <Separator className="mb-6" />

      {/* Settings Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Settings */}
        <Card data-testid="card-account-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Hesap Ayarları
            </CardTitle>
            <CardDescription>
              Profil bilgilerinizi ve güvenlik ayarlarınızı yönetin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Hesap sayfasından profil bilgilerinizi güncelleyebilir, şifrenizi değiştirebilir ve hesabınızı yönetebilirsiniz.
            </p>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card data-testid="card-notification-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Bildirim Ayarları
            </CardTitle>
            <CardDescription>
              E-posta ve uygulama bildirimlerini yapılandırın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Hangi durumlarda bildirim almak istediğinizi seçebilir, e-posta tercihlerinizi ayarlayabilirsiniz.
            </p>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card data-testid="card-data-privacy">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Veri ve Gizlilik
            </CardTitle>
            <CardDescription>
              Verilerinizi yönetin ve gizlilik ayarlarınızı kontrol edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Kişisel verilerinizi görüntüleyebilir, dışa aktarabilir veya hesabınızı silebilirsiniz.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Daha Fazla Ayar Yakında</h3>
              <p className="text-muted-foreground">
                Daha detaylı ayar seçenekleri üzerinde çalışıyoruz. 
                Yakında daha fazla özelleştirme seçeneği eklenecek.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSettings;