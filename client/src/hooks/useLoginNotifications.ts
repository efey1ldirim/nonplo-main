import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/lib/supabase';

export function useLoginNotifications() {
  const { toast } = useToast();
  const { session, isLoading } = useSupabaseAuth();

  useEffect(() => {
    // When user successfully logs in, directly check with backend
    if (!isLoading && session?.user?.id) {
      console.log('🔑 User logged in, checking for cancellation...');
      
      // Call API directly after login to check status
      const checkDeletionStatus = async () => {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          const token = currentSession?.access_token;
          
          if (!token) return;
          
          const response = await fetch('/api/account/status', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Account status:', data);
            
            if (data.deletionCancelled) {
              toast({
                title: "Silme Planınız İptal Edildi",
                description: "Hoş geldiniz! Hesap silme planınız otomatik olarak iptal edildi.",
                duration: 6000,
              });
            }
          } else {
            console.error('❌ Account status check failed:', response.status);
          }
        } catch (error) {
          console.error('❌ Error checking deletion status:', error);
        }
      };
      
      // Check after a short delay to ensure backend auth processed
      setTimeout(() => {
        checkDeletionStatus().catch(error => {
          console.error('Failed to check deletion status:', error);
        });
      }, 1000);
    }
  }, [session?.user?.id, isLoading, toast]);
}