import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, Bell, X } from 'lucide-react';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'agent_created' | 'agent_updated' | 'new_message' | 'dashboard_stats';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function RealTimeStatus() {
  const { isConnected, isConnecting, reconnect, hasMaxedRetries } = useRealTimeData();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Listen for WebSocket events and create notifications
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'agent_created') {
          const notification: Notification = {
            id: Date.now().toString(),
            type: 'agent_created',
            title: 'Yeni Dijital Çalışan Oluşturuldu',
            message: `${message.data.name} başarıyla oluşturuldu`,
            timestamp: new Date(),
            read: false
          };
          
          setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
          
          toast({
            title: notification.title,
            description: notification.message,
          });
        } else if (message.type === 'agent_updated') {
          const notification: Notification = {
            id: Date.now().toString(),
            type: 'agent_updated',
            title: 'Dijital Çalışan Güncellendi',
            message: `${message.data.name} güncellendi`,
            timestamp: new Date(),
            read: false
          };
          
          setNotifications(prev => [notification, ...prev.slice(0, 4)]);
          
          toast({
            title: notification.title,
            description: notification.message,
          });
        } else if (message.type === 'new_message') {
          const notification: Notification = {
            id: Date.now().toString(),
            type: 'new_message',
            title: 'Yeni Mesaj',
            message: 'Yeni bir konuşma mesajı aldınız',
            timestamp: new Date(),
            read: false
          };
          
          setNotifications(prev => [notification, ...prev.slice(0, 4)]);
        }
      } catch (error) {
        console.error('Notification parsing error:', error);
      }
    };

    // Listen for WebSocket messages
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // This is a simplified approach - in real implementation you'd want to share the same WebSocket
    // For now, we'll just show the connection status
    
    return () => {
      // Cleanup if needed
    };
  }, [toast]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      <Badge 
        variant={isConnected ? "default" : "secondary"} 
        className={`flex items-center gap-1 ${
          isConnected 
            ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
            : isConnecting
              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        }`}
      >
        {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isConnected ? "Canlı" : isConnecting ? "Bağlanıyor..." : "Offline"}
      </Badge>

      {/* Reconnect button when offline and not connecting */}
      {!isConnected && !isConnecting && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={reconnect}
          className="text-xs"
          disabled={hasMaxedRetries}
        >
          {hasMaxedRetries ? "Bağlantı Başarısız" : "Yeniden Bağlan"}
        </Button>
      )}

      {/* Notifications */}
      {unreadCount > 0 && (
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNotifications(!showNotifications)}
            className="flex items-center gap-1"
          >
            <Bell className="h-3 w-3" />
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {showNotifications && (
            <Card className="absolute right-0 top-8 w-80 z-50 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Bildirimler</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearAllNotifications}
                      className="text-xs h-6"
                    >
                      Temizle
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNotifications(false)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Henüz bildirim yok
                  </p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          notification.read 
                            ? 'bg-gray-50 dark:bg-gray-800/50' 
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="text-sm font-medium">
                          {notification.title}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {notification.message}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {notification.timestamp.toLocaleTimeString('tr-TR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}