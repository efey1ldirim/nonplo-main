import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useScheduleDeletion } from '@/hooks/useAccountStatus';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export default function AccountDeletion() {
  const navigate = useNavigate();
  const { scheduleDeletion, isLoading } = useScheduleDeletion();
  const { toast } = useToast();
  const { signOut } = useSupabaseAuth();
  const [reason, setReason] = useState('');
  const [confirmations, setConfirmations] = useState({
    dataLoss: false,
    thirtyDays: false,
    permanent: false,
  });

  const allConfirmed = Object.values(confirmations).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allConfirmed) {
      toast({
        title: "Eksik Onay",
        description: "Lütfen tüm onay kutucuklarını işaretleyin.",
        variant: "destructive",
      });
      return;
    }

    try {
      await scheduleDeletion(reason || undefined);
      
      toast({
        title: "Hesap Silme Planlandı",
        description: "Hesabınız 30 gün sonra silinecek. Oturumunuz kapatılacak.",
      });
      
      // 2 saniye bekleyip kullanıcıyı çıkış yap
      setTimeout(async () => {
        await signOut();
        navigate('/');
      }, 2000);
      
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Hesap silme planlaması başarısız",
        variant: "destructive",
      });
    }
  };

  const handleConfirmationChange = (key: keyof typeof confirmations, checked: boolean) => {
    setConfirmations(prev => ({ ...prev, [key]: checked }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/account')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ayarlara Dön
          </Button>
          
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Hesap Silme
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Bu işlem geri alınamaz. Lütfen dikkatli olun.
            </p>
          </div>
        </div>

        {/* Warning Alert */}
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/10 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Önemli:</strong> Hesabınızı sildiğinizde, 30 gün boyunca verileriniz saklanacak 
            ve bu süre içinde hesabınızı tekrar aktifleştirebilirsiniz. 30 gün sonra tüm verileriniz 
            kalıcı olarak silinecek.
          </AlertDescription>
        </Alert>

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Hesap Silme İsteği
            </CardTitle>
            <CardDescription>
              Hesabınızı silmek isteme nedeninizi belirtebilirsiniz (isteğe bağlı).
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Reason Input */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium mb-2">
                  Silme Nedeni (İsteğe Bağlı)
                </label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Hesabınızı neden silmek istediğinizi belirtebilirsiniz..."
                  className="min-h-[100px]"
                  data-testid="textarea-deletion-reason"
                />
              </div>

              {/* Confirmations */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Onaylar
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="dataLoss"
                      checked={confirmations.dataLoss}
                      onCheckedChange={(checked) => 
                        handleConfirmationChange('dataLoss', checked as boolean)
                      }
                      data-testid="checkbox-data-loss"
                    />
                    <label htmlFor="dataLoss" className="text-sm leading-5">
                      Tüm verilerimin (ajanlar, konuşmalar, ayarlar) silineceğini anlıyorum.
                    </label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="thirtyDays"
                      checked={confirmations.thirtyDays}
                      onCheckedChange={(checked) => 
                        handleConfirmationChange('thirtyDays', checked as boolean)
                      }
                      data-testid="checkbox-thirty-days"
                    />
                    <label htmlFor="thirtyDays" className="text-sm leading-5">
                      30 gün boyunca hesabımı tekrar aktifleştirebileceğimi biliyorum.
                    </label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="permanent"
                      checked={confirmations.permanent}
                      onCheckedChange={(checked) => 
                        handleConfirmationChange('permanent', checked as boolean)
                      }
                      data-testid="checkbox-permanent"
                    />
                    <label htmlFor="permanent" className="text-sm leading-5">
                      30 gün sonra verilerimin kalıcı olarak silineceğini kabul ediyorum.
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t">
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  disabled={!allConfirmed || isLoading}
                  data-testid="button-schedule-deletion"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Planlanıyor...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hesap Silmeyi Planla
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Ne Olacak?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
              <p>Hesabınız hemen deaktive edilecek ve ajanlarınız çalışmayı durduracak.</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
              <p>30 gün boyunca verileriniz korunacak ve giriş yaparak hesabınızı tekrar aktifleştirebilirsiniz.</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
              <p>30 gün sonra tüm verileriniz kalıcı olarak silinecek ve geri getirilemeyecek.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}