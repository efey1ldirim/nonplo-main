import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  enabled?: boolean;
}

/**
 * Hook for real-time Supabase subscriptions
 * Handles connection management and automatic cleanup
 */
export const useRealtimeSubscription = <T = any>(
  options: UseRealtimeSubscriptionOptions,
  callback: (payload: any) => void
) => {
  const memoizedCallback = useCallback(callback, [callback]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const { table, filter, event = '*', enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    // Create channel name with filter for uniqueness
    const channelName = `${table}${filter ? `-${filter}` : ''}`;
    
    const newChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload: any) => {
          try {
            memoizedCallback(payload);
          } catch (error) {
            console.error('Realtime callback error:', error);
            setError('Callback execution failed');
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'CHANNEL_ERROR') {
          setError('Channel connection failed');
        } else if (status === 'TIMED_OUT') {
          setError('Connection timed out');
        } else {
          setError(null);
        }
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
      setIsConnected(false);
    };
  }, [table, filter, event, enabled, memoizedCallback]);

  return {
    isConnected,
    error,
    channel,
  };
};

/**
 * Hook for subscribing to table changes with automatic data fetching
 */
export const useRealtimeTable = <T = any>(
  table: string,
  initialData: T[] = [],
  options: Omit<UseRealtimeSubscriptionOptions, 'table'> = {}
) => {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);

  const { isConnected, error } = useRealtimeSubscription(
    { table, ...options },
    (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      setData(currentData => {
        switch (eventType) {
          case 'INSERT':
            return [...currentData, newRecord];
          
          case 'UPDATE':
            return currentData.map(item => 
              (item as any).id === newRecord.id ? newRecord : item
            );
          
          case 'DELETE':
            return currentData.filter(item => 
              (item as any).id !== oldRecord.id
            );
          
          default:
            return currentData;
        }
      });
    }
  );

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      if (initialData.length > 0) return;
      
      setLoading(true);
      try {
        const { data: fetchedData, error } = await supabase
          .from(table)
          .select('*');

        if (error) throw error;
        setData(fetchedData || []);
      } catch (error) {
        console.error(`Error fetching initial ${table} data:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [table, initialData]);

  return {
    data,
    loading,
    isConnected,
    error,
  };
};