import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useSupabaseAuth } from './useSupabaseAuth';

interface AccountStatus {
  scheduledDeletion?: {
    id: string;
    userId: string;
    scheduledAt: string;
    deletionDate: string;
    reason?: string;
    status: 'scheduled' | 'cancelled' | 'completed';
    cancelledAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  deletionCancelled?: boolean;
  recentCancellation?: any;
}

export function useAccountStatus() {
  const { session } = useSupabaseAuth();
  
  const query = useQuery<AccountStatus>({
    queryKey: ['/api/account/status'], // Keep it simple - no user ID in key
    retry: false,
    staleTime: 1000, // More frequent checks for notifications
    enabled: !!session?.user, // Only run when user is authenticated
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Log data when it changes
  if (query.data) {
    console.log('Account status fetched:', query.data);
    if (query.data.deletionCancelled) {
      console.log('Deletion was cancelled recently:', query.data.recentCancellation);
    }
  }

  if (query.error) {
    console.error('Account status error:', query.error);
    console.error('Account status error details:', {
      message: query.error.message,
      name: query.error.name,
      stack: query.error.stack
    });
  }

  return query;
}

export function useScheduleDeletion() {
  const [isLoading, setIsLoading] = useState(false);

  const scheduleDeletion = async (reason?: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/account/schedule-deletion', {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Hesap silme planlaması başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  return { scheduleDeletion, isLoading };
}

export function useCancelDeletion() {
  const [isLoading, setIsLoading] = useState(false);

  const cancelDeletion = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/account/cancel-deletion', {
        method: 'POST',
      });
      
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Hesap aktifleştirme başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  return { cancelDeletion, isLoading };
}