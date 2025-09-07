import { useEffect, useRef, useState } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';

interface DashboardStats {
  activeAgents: number;
  totalMessages: number;
  totalConversations: number;
  weeklyMessageCounts: number[];
}

export function useRealTimeData() {
  const { user } = useSupabaseAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!user?.id) return;

    try {
      setIsConnecting(true);
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Connection timeout after 5 seconds
      const connectionTimeout = setTimeout(() => {
        console.log('📡 Connection timeout, retrying...');
        setIsConnecting(false);
        ws.close();
      }, 5000);

      ws.onopen = () => {
        console.log('📡 Real-time data connection established');
        clearTimeout(connectionTimeout);
        setIsConnecting(false);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        
        // Authenticate with user ID immediately
        ws.send(JSON.stringify({
          type: 'auth',
          userId: user.id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'dashboard_stats') {
            setStats(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('📡 Real-time data connection closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Reconnect with exponential backoff if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Cap at 30 seconds
          reconnectAttemptsRef.current += 1;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`📡 Attempting to reconnect... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log('📡 Max reconnection attempts reached. Stopped trying to reconnect.');
        }
      };

      ws.onerror = (error) => {
        // Only log if it's not a connection timeout (which is handled elsewhere)
        if (reconnectAttemptsRef.current === 0) {
          console.error('📡 Real-time data connection error:', error);
        }
        setIsConnected(false);
        setIsConnecting(false);
        clearTimeout(connectionTimeout);
      };

    } catch (error) {
      console.error('📡 Failed to establish real-time data connection:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const manualReconnect = () => {
    reconnectAttemptsRef.current = 0; // Reset attempts for manual reconnection
    disconnect();
    setTimeout(connect, 500); // Short delay before reconnecting
  };

  return {
    stats,
    isConnected,
    isConnecting,
    reconnect: manualReconnect,
    hasMaxedRetries: reconnectAttemptsRef.current >= maxReconnectAttempts
  };
}