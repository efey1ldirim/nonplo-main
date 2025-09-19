import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Activity, TrendingUp, Settings2, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ContextManagerStats {
  overview: {
    enabled: boolean;
    optimizationLevel: string;
  };
  settings: {
    enabled: boolean;
    liveBudget: number;
    hardCap: number;
    autoOptimize: boolean;
    enablePiiStripping: boolean;
    debugMode: boolean;
    usage: {
      totalTokensUsed: number;
      totalCost: number;
      requestCount: number;
      lastReset: string;
    };
    storeStats: {
      settingsFileExists: boolean;
      backupFileExists: boolean;
      settingsFileSize: number;
      lastModified: string;
      cacheHit: boolean;
    };
  };
  usage: {
    totalTokensUsed: number;
    totalCost: number;
    requestCount: number;
    lastReset: string;
  };
  components: {
    tokenizer: {
      cacheSize: number;
      cacheHitRate: number;
      encoderAvailable: boolean;
    };
    summarizer: {
      cacheSize: number;
      totalSummaries: number;
      averageCompressionRatio: number;
      totalProcessingTime: number;
    };
    optimizer: {
      cacheSize: number;
      lastOptimization: string | null;
      metricsCount: number;
      currentLevel: string | null;
    };
  };
  projections: {
    daily: { tokens: number; cost: number; requests: number; };
    weekly: { tokens: number; cost: number; requests: number; };
    monthly: { tokens: number; cost: number; requests: number; };
  };
  timestamp: string;
}

const ContextManagerSettings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<ContextManagerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [authError, setAuthError] = useState(false);
  const { toast } = useToast();

  // Context Manager stats'larını yükle
  const loadStats = async () => {
    if (!user || authLoading) {
      if (!authLoading) {
        setAuthError(true);
        setLoading(false);
      }
      return;
    }

    try {
      setAuthError(false);
      
      // Import ApiClient dinamik olarak
      const { ApiClient } = await import('@/lib/api');
      const response = await ApiClient.request('/context-manager/stats', {
        method: 'GET'
      });

      
      // Backend returns { success: true, data: {...} } format
      const stats = response.success ? response.data : response;
      setStats(stats as ContextManagerStats);
    } catch (error: any) {
      console.error('Error loading Context Manager stats:', error);
      if (error.message?.includes('401') || error.message?.includes('Authentication required')) {
        setAuthError(true);
        console.error('Authentication required for Context Manager stats');
      } else {
        console.error('Unexpected error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Context Manager'ı aç/kapat
  const toggleContextManager = async (enabled: boolean) => {
    if (!user || authLoading) {
      setAuthError(true);
      return;
    }
    
    setToggling(true);
    try {
      
      // Import ApiClient dinamik olarak
      const { ApiClient } = await import('@/lib/api');
      const response = await ApiClient.request('/context-manager/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });

      
      // Backend returns { success: true, data: {...} } format
      const updatedStats = response.success ? response.data : response;
      setStats(updatedStats as ContextManagerStats);
      
      toast({
        title: enabled ? "Context Manager Etkinleştirildi" : "Context Manager Devre Dışı Bırakıldı",
        description: enabled 
          ? "Token optimizasyonu ve akıllı özet sistemi aktif." 
          : "Token optimizasyonu devre dışı bırakıldı.",
      });
    } catch (error: any) {
      console.error('Error toggling Context Manager:', error);
      if (error.message?.includes('401') || error.message?.includes('Authentication required')) {
        setAuthError(true);
        toast({
          title: "Giriş Gerekli",
          description: "Bu işlem için giriş yapmanız gerekiyor",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Hata",
          description: "Context Manager ayarı değiştirilemedi.",
          variant: "destructive",
        });
      }
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    
    if (!authLoading) {
      if (user) {
        loadStats();
      } else {
        setAuthError(true);
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  // Her 30 saniyede bir stats'ları otomatik güncelle (sadece component aktifken ve user varken)
  useEffect(() => {
    if (!user || authError || authLoading) {
      return;
    }
    
    const interval = setInterval(() => {
      loadStats();
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user, authError, authLoading]);

  // Authentication required state
  if (authError || !user) {
    return (
      <Card data-testid="card-context-manager-auth">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            Context Manager
            <Badge variant="secondary" data-testid="badge-status">
              Giriş Gerekli
            </Badge>
          </CardTitle>
          <CardDescription>
            Context Manager ayarlarına erişmek için giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LogIn className="h-4 w-4" />
            <span>Lütfen hesabınıza giriş yapın</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.location.href = '/auth'}
            data-testid="button-login"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Giriş Yap
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading || authLoading) {
    return (
      <Card data-testid="card-context-manager-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            Context Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card data-testid="card-context-manager-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            Context Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Context Manager bilgileri yüklenemedi.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={loadStats}
            data-testid="button-retry-load"
          >
            Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = stats.usage 
    ? Math.round((stats.usage.totalTokensUsed / stats.liveBudget) * 100)
    : 0;

  return (
    <Card data-testid="card-context-manager">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Context Manager
          <Badge variant={stats.enabled ? "default" : "secondary"} data-testid="badge-status">
            {stats.enabled ? "Aktif" : "Pasif"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Uzun konuşmalarda token optimizasyonu ve akıllı özet sistemi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="context-manager-toggle" className="text-sm font-medium">
              Context Manager
            </label>
            <p className="text-xs text-muted-foreground">
              Token limitlerini otomatik yönet
            </p>
          </div>
          <Switch
            id="context-manager-toggle"
            checked={stats.enabled}
            onCheckedChange={toggleContextManager}
            disabled={toggling}
            data-testid="switch-context-manager"
          />
        </div>

        {stats.enabled && (
          <>
            {/* Budget Information */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Live Budget</span>
                <span className="font-medium" data-testid="text-live-budget">
                  {stats.liveBudget.toLocaleString()} token
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hard Cap</span>
                <span className="font-medium" data-testid="text-hard-cap">
                  {stats.hardCap.toLocaleString()} token
                </span>
              </div>
            </div>

            {/* Usage Statistics */}
            {stats.usage && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Kullanım İstatistikleri</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Kullanılan Token</span>
                    <span className="font-medium" data-testid="text-tokens-used">
                      {stats.usage.totalTokensUsed.toLocaleString()}
                    </span>
                  </div>
                  
                  <Progress 
                    value={Math.min(usagePercentage, 100)} 
                    className="h-2"
                    data-testid="progress-token-usage"
                  />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Toplam Maliyet</span>
                    <span className="font-medium" data-testid="text-total-cost">
                      ${stats.usage.totalCost.toFixed(4)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Request Sayısı</span>
                    <span className="font-medium" data-testid="text-request-count">
                      {stats.usage.requestCount}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Optimization Statistics */}
            {stats.diagnostics && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Optimizasyon</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Toplam Optimizasyon</p>
                    <p className="font-medium" data-testid="text-total-optimizations">
                      {stats.diagnostics.totalOptimizations}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ortalama Tasarruf</p>
                    <p className="font-medium" data-testid="text-average-reduction">
                      %{stats.diagnostics.averageReduction}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings Button */}
            <div className="pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                data-testid="button-advanced-settings"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Gelişmiş Ayarlar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ContextManagerSettings;