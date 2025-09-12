import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Activity,
  Clock,
  AlertTriangle,
  BarChart3,
  Zap,
  RefreshCw
} from "lucide-react";
import { LoadingSpinner, SkeletonContent } from "@/components/ui/enhanced-loading";
import { ErrorDisplay } from "@/components/ui/enhanced-error-handling";
import { trackFeatureUsage } from "@/lib/analytics";

interface AnalyticsData {
  overview: {
    uniqueUsers: number;
    totalSessions: number;
    pageViews: number;
    totalEvents: number;
    avgSessionDuration: number;
  };
  popularPages: Array<{ page: string; views: number }>;
  eventTypes: Array<{ event: string; count: number }>;
  businessMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    totalAgents: number;
    activeAgents: number;
    totalConversations: number;
    recentConversations: number;
  };
  timeframe: string;
  generatedAt: string;
}

interface RealTimeData {
  currentUsers: number;
  activeSessions: number;
  eventsLast5Min: number;
  eventsLastHour: number;
  timestamp: string;
}

const AnalyticsDashboard = () => {
  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch analytics data
  const { 
    data: analytics, 
    isLoading: analyticsLoading, 
    error: analyticsError,
    refetch: refetchAnalytics 
  } = useQuery({
    queryKey: ['/api/analytics/dashboard', timeframe],
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
  });

  // Fetch real-time data
  const { 
    data: realTime, 
    isLoading: realTimeLoading,
    error: realTimeError 
  } = useQuery({
    queryKey: ['/api/analytics/realtime'],
    refetchInterval: autoRefresh ? 5000 : false, // 5 seconds
  });

  // Fetch performance data
  const { 
    data: performance, 
    isLoading: performanceLoading,
    error: performanceError 
  } = useQuery({
    queryKey: ['/api/analytics/performance', timeframe],
  });

  // Fetch error data
  const { 
    data: errors, 
    isLoading: errorsLoading,
    error: errorsError 
  } = useQuery({
    queryKey: ['/api/analytics/errors', timeframe],
  });

  useEffect(() => {
    trackFeatureUsage('analytics_dashboard', 'view', { timeframe });
  }, [timeframe]);

  const handleTimeframeChange = (newTimeframe: typeof timeframe) => {
    setTimeframe(newTimeframe);
    trackFeatureUsage('analytics_dashboard', 'timeframe_change', { timeframe: newTimeframe });
  };

  const handleRefresh = () => {
    refetchAnalytics();
    trackFeatureUsage('analytics_dashboard', 'manual_refresh');
  };

  if (analyticsLoading) {
    return (
      <div className="space-y-6">
        <SkeletonContent type="chart" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonContent key={i} type="card" />
          ))}
        </div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <ErrorDisplay
        error={analyticsError as Error}
        title="Analytics verisi yüklenemedi"
        onRetry={handleRefresh}
      />
    );
  }

  const data = analytics as AnalyticsData;
  const rtData = realTime as RealTimeData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Sistem performansı ve kullanıcı davranışları
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={autoRefresh ? "default" : "secondary"}>
              {autoRefresh ? "Otomatik yenileme açık" : "Manuel mod"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className="h-4 w-4 mr-2" />
              {autoRefresh ? "Durdur" : "Başlat"}
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Real-time metrics */}
      {rtData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              Canlı Veriler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{rtData.currentUsers}</div>
                <div className="text-sm text-muted-foreground">Aktif Kullanıcı</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{rtData.activeSessions}</div>
                <div className="text-sm text-muted-foreground">Aktif Oturum</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{rtData.eventsLast5Min}</div>
                <div className="text-sm text-muted-foreground">Son 5dk Event</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{rtData.eventsLastHour}</div>
                <div className="text-sm text-muted-foreground">Son 1sa Event</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeframe selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Zaman Aralığı:</span>
        {(['hour', 'day', 'week', 'month'] as const).map((tf) => (
          <Button
            key={tf}
            variant={timeframe === tf ? "default" : "outline"}
            size="sm"
            onClick={() => handleTimeframeChange(tf)}
          >
            {tf === 'hour' && 'Son Saat'}
            {tf === 'day' && 'Son Gün'}
            {tf === 'week' && 'Son Hafta'}
            {tf === 'month' && 'Son Ay'}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="performance">Performans</TabsTrigger>
          <TabsTrigger value="errors">Hatalar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Benzersiz Kullanıcı</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.overview.uniqueUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {data?.timeframe} içinde
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Toplam Oturum</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.overview.totalSessions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Ortalama {data?.overview.avgSessionDuration?.toFixed(1) || 0} dakika
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sayfa Görüntüleme</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.overview.pageViews || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Toplam {data?.overview.totalEvents || 0} event
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktif Agent</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.businessMetrics.activeAgents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Toplam {data?.businessMetrics.totalAgents || 0} agent
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Popular pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Popüler Sayfalar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data?.popularPages.slice(0, 5).map((page, index) => (
                    <div key={page.page} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{page.page}</span>
                      <Badge variant="secondary">{page.views}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Türleri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data?.eventTypes.slice(0, 5).map((event, index) => (
                    <div key={event.event} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{event.event}</span>
                      <Badge variant="secondary">{event.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Toplam Kullanıcı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data?.businessMetrics.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aktif Kullanıcı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {data?.businessMetrics.activeUsers || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Yeni Kullanıcı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {data?.businessMetrics.newUsers || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {performanceLoading ? (
            <LoadingSpinner size="lg" />
          ) : performanceError ? (
            <ErrorDisplay error={performanceError as Error} />
          ) : performance ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ortalama Yanıt Süresi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {performance.overview?.avgResponseTime?.toFixed(0) || 0}ms
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Toplam İstek</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {performance.overview?.totalRequests || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Yavaş İstek</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {performance.overview?.slowRequests || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          {errorsLoading ? (
            <LoadingSpinner size="lg" />
          ) : errorsError ? (
            <ErrorDisplay error={errorsError as Error} />
          ) : errors ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Toplam Hata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {errors.overview?.totalErrors || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hata Oranı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {errors.overview?.errorRate?.toFixed(2) || 0}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Benzersiz Hata Türü</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {errors.overview?.uniqueErrorTypes || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;