import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Activity, TrendingUp, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContextManagerStats {
  enabled: boolean;
  liveBudget: number;
  hardCap: number;
  usage?: {
    totalTokensUsed: number;
    totalCost: number;
    requestCount: number;
    lastReset: string;
  };
  diagnostics?: {
    totalOptimizations: number;
    averageReduction: number;
    lastOptimization: string;
  };
}

const ContextManagerSettings = () => {
  const [stats, setStats] = useState<ContextManagerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const { toast } = useToast();

  // Context Manager stats'larını yükle
  const loadStats = async () => {
    try {
      const response = await fetch('/api/context-manager/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to load Context Manager stats');
      }
    } catch (error) {
      console.error('Error loading Context Manager stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Context Manager'ı aç/kapat
  const toggleContextManager = async (enabled: boolean) => {
    setToggling(true);
    try {
      const response = await fetch('/api/context-manager/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        const updatedStats = await response.json();
        setStats(updatedStats);
        toast({
          title: enabled ? "Context Manager Etkinleştirildi" : "Context Manager Devre Dışı Bırakıldı",
          description: enabled 
            ? "Token optimizasyonu ve akıllı özet sistemi aktif." 
            : "Token optimizasyonu devre dışı bırakıldı.",
        });
      } else {
        throw new Error('Failed to toggle Context Manager');
      }
    } catch (error) {
      console.error('Error toggling Context Manager:', error);
      toast({
        title: "Hata",
        description: "Context Manager ayarı değiştirilemedi.",
        variant: "destructive",
      });
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
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