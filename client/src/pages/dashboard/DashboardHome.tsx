import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Wifi, WifiOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { Badge } from "@/components/ui/badge";
import { RealTimeStatus } from "@/components/RealTimeStatus";
import { AccountStatusNotification } from "@/components/AccountStatusNotification";

interface DashboardStats {
  activeAgents: number;
  totalMessages: number;
  totalConversations: number;
  weeklyMessageCounts: number[];
}

const DashboardHome = () => {
  // Real-time data hook
  const { stats: realTimeStats, isConnected } = useRealTimeData();
  
  // Fallback API query for when WebSocket is not available
  const { data: apiStats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (reduced from 5)
    refetchInterval: isConnected ? false : 15 * 1000, // Only refetch if not connected to WebSocket (15s instead of 30s)
    retry: 1,
    retryDelay: 500, // Faster retry
  });
  
  // Use real-time data if available, otherwise fallback to API data
  const stats = realTimeStats || apiStats;
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-full">
      {/* Account Status Notification */}
      <AccountStatusNotification />
      
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Dijital Çalışan Yönetim Paneli
          </h1>
          <RealTimeStatus />
        </div>
        <p className="text-muted-foreground text-base md:text-lg">
          Yapay Zeka Destekli Dijital Çalışanlarınızı yönetin ve kontrol edin
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 md:mb-8">
        <Card className="min-h-[100px] md:min-h-[120px]">
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Aktif Dijital Çalışan Sayısı
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 p-3 md:p-6">
            <div className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
              {(isLoading && !realTimeStats) ? "..." : stats?.activeAgents || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[100px] md:min-h-[120px]">
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Toplam Mesaj
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 p-3 md:p-6">
            <div className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
              {(isLoading && !realTimeStats) ? "..." : stats?.totalMessages || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[100px] md:min-h-[120px] sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Konuşma Sayısı
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 p-3 md:p-6">
            <div className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
              {(isLoading && !realTimeStats) ? "..." : stats?.totalConversations || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="w-full overflow-hidden">
        <CardHeader className="pb-3 p-4 md:p-6">
          <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
            <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
            <span>Son 7 Gün Etkileşim Trendi</span>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Günlük mesaj ve etkileşim istatistikleri
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 p-4 md:p-6">
          <div className="w-full">
            {/* Chart Container */}
            <div className="h-32 md:h-40 lg:h-48 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-lg p-2 md:p-3 mb-2 md:mb-3">
              <div className="h-full grid grid-cols-7 gap-1 md:gap-2 items-end">
                {(isLoading && !realTimeStats) ? (
                  // Loading state - show placeholder bars
                  [20, 35, 45, 30, 55, 40, 60].map((height, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-t from-gray-300 to-gray-400 rounded-t-sm animate-pulse"
                      style={{ height: `${height}%` }}
                    />
                  ))
                ) : (
                  // Real data - calculate heights based on max value
                  (stats?.weeklyMessageCounts || [0, 0, 0, 0, 0, 0, 0]).map((count, index) => {
                    const maxCount = Math.max(...(stats?.weeklyMessageCounts || [1]));
                    const height = maxCount > 0 ? Math.max((count / maxCount) * 80, 5) : 5; // Min 5% height
                    return (
                      <div
                        key={index}
                        className="bg-gradient-to-t from-primary to-purple-500 rounded-t-sm transition-all hover:opacity-80 relative group"
                        style={{ height: `${height}%` }}
                        title={`${count} mesaj`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {count} mesaj
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 text-xs text-muted-foreground text-center px-2 md:px-3">
              <span>Pzt</span>
              <span>Sal</span>
              <span>Çar</span>
              <span>Per</span>
              <span>Cum</span>
              <span>Cmt</span>
              <span>Paz</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;