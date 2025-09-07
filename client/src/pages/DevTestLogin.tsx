import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export function DevTestLogin() {
  const navigate = useNavigate();
  
  const redirectToLogin = () => {
    // Clean up any test data and redirect to real Supabase authentication
    localStorage.removeItem('dev-test-auth');
    window.location.href = '/auth'; // Redirect to real login page
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            🔐 Giriş Yap
          </CardTitle>
          <p className="text-center text-gray-600 dark:text-gray-400">
            30-gün hesap silme bildirim sistemini test etmek için giriş yapın
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button onClick={redirectToLogin} className="w-full" data-testid="button-redirect-login">
              Gerçek Oturum Açma Sayfasına Git
            </Button>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <p>✅ Gerçek Supabase authentication sistemi kullanılır</p>
            <p>✅ 30-gün hesap silme bildirim sistemi tamamen hazır</p>
            <p>✅ Backend API endpoint'leri aktif ve çalışıyor</p>
            <p>✅ Otomatik iptal sistemi authentication middleware'de mevcut</p>
            <p>• Oturum açtıktan sonra "Hesap silme iptal edildi" bildirimi göreceksiniz</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}