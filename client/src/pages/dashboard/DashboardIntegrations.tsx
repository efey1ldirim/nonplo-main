import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CheckCircle, ExternalLink, Wrench, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CalendarConnection {
  connected: boolean;
  email?: string;
  connectedAt?: string;
}

const DashboardIntegrations: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calendarConnection, setCalendarConnection] = useState<CalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Check calendar connection status
  const checkCalendarStatus = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/calendar/status', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalendarConnection(data);
      } else {
        setCalendarConnection({ connected: false });
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
      setCalendarConnection({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  // Connect to Google Calendar
  const handleConnectCalendar = async () => {
    if (!user) return;
    
    setConnecting(true);
    try {
      const response = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          redirectUrl: window.location.origin + '/dashboard/integrations'
        })
      });
      
      if (response.ok) {
        const { authUrl } = await response.json();
        // Redirect to Google OAuth
        window.location.href = authUrl;
      } else {
        toast({
          title: "Bağlantı Hatası",
          description: "Google Calendar bağlantısı başlatılamadı.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: "Bağlantı Hatası", 
        description: "Beklenmeyen bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect from Google Calendar
  const handleDisconnectCalendar = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setCalendarConnection({ connected: false });
        toast({
          title: "Başarılı",
          description: "Google Calendar bağlantısı kesildi.",
        });
      } else {
        toast({
          title: "Hata",
          description: "Bağlantı kesilemedi.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: "Hata",
        description: "Beklenmeyen bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      checkCalendarStatus();
    }
  }, [user]);

  // Check if user came back from OAuth flow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'true') {
      toast({
        title: "Başarılı!",
        description: "Google Calendar başarıyla bağlandı.",
      });
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations');
      // Refresh status
      checkCalendarStatus();
    } else if (error) {
      toast({
        title: "Bağlantı Hatası",
        description: "Google Calendar bağlanırken bir hata oluştu.",
        variant: "destructive",
      });
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Entegrasyonlar</h1>
          <p className="text-muted-foreground">
            Acenteniz için çeşitli entegrasyonları yönetin
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Google Calendar Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Google Calendar</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Randevu ve etkinlik yönetimi için takvim entegrasyonu
                  </p>
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <Badge variant={calendarConnection?.connected ? "default" : "secondary"}>
                  {calendarConnection?.connected ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Bağlı
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Bağlı Değil
                    </div>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <div className="space-y-4">
                {calendarConnection?.connected ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>Bağlı Hesap:</strong> {calendarConnection.email}
                      </p>
                      {calendarConnection.connectedAt && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Bağlantı Tarihi:</strong> {new Date(calendarConnection.connectedAt).toLocaleDateString('tr-TR')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDisconnectCalendar}
                        data-testid="button-disconnect-calendar"
                      >
                        Bağlantıyı Kes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://calendar.google.com', '_blank')}
                        data-testid="button-open-calendar"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Takvimi Aç
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Google Calendar'ınızı bağlayarak acentenizin randevu almasını, 
                      müsaitlik kontrolü yapmasını ve takvim etkinlikleri oluşturmasını sağlayın.
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium">Bu entegrasyon şunları sağlar:</p>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• Otomatik randevu oluşturma</li>
                          <li>• Müsaitlik kontrolü</li>
                          <li>• Takvim etkinlikleri yönetimi</li>
                          <li>• Çakışan randevu uyarıları</li>
                        </ul>
                      </div>
                    </div>
                    <Button
                      onClick={handleConnectCalendar}
                      disabled={connecting}
                      data-testid="button-connect-calendar"
                    >
                      {connecting ? "Bağlanıyor..." : "Google Calendar'ı Bağla"}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other integrations placeholder */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-500">Diğer Entegrasyonlar</CardTitle>
                <p className="text-sm text-muted-foreground">
                  WhatsApp, Instagram, Email ve diğer entegrasyonlar yakında gelecek
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Daha fazla entegrasyon seçeneği geliştirme aşamasındadır.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardIntegrations;