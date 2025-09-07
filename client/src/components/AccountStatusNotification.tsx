import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAccountStatus, useCancelDeletion } from '@/hooks/useAccountStatus';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export function AccountStatusNotification() {
  const { data: accountStatus, isLoading } = useAccountStatus();
  const { cancelDeletion, isLoading: isCancelling } = useCancelDeletion();
  const { toast } = useToast();

  // Show notification if account deletion is scheduled
  const scheduledDeletion = accountStatus?.scheduledDeletion;
  const showNotification = scheduledDeletion && scheduledDeletion.status === 'scheduled';

  const handleCancelDeletion = async () => {
    try {
      await cancelDeletion();
      
      // Invalidate and refetch account status
      queryClient.invalidateQueries({ queryKey: ['/api/account/status'] });
      
      toast({
        title: "Hesap Aktifleştirildi",
        description: "Hesap silme işlemi iptal edildi. Hesabınız tekrar aktif.",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Hesap aktifleştirme başarısız",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !showNotification) {
    return null;
  }

  const deletionDate = new Date(scheduledDeletion.deletionDate);
  const now = new Date();
  const daysLeft = Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Alert 
      className="mb-6 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-300"
      data-testid="account-deletion-notification"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>Hesap Silme Uyarısı:</strong> Hesabınız {daysLeft} gün sonra silinecek. 
          {daysLeft <= 7 && (
            <span className="text-red-600 dark:text-red-400 font-semibold ml-1">
              (Son {daysLeft} gün!)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelDeletion}
          disabled={isCancelling}
          className="ml-4 border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-800/20"
          data-testid="button-cancel-deletion"
        >
          {isCancelling ? 'İptal ediliyor...' : 'Hesabı Aktifleştir'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}