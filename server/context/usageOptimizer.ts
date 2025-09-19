/**
 * Usage Optimizer Module
 * OpenAI kullanım verilerini analiz ederek dinamik budget belirleme
 */

import { USAGE_OPTIMIZER_CONFIG, CACHE_CONFIG } from './config';
import { store } from './store';

interface UsageMetric {
  date: Date;
  tokens: number;
  cost: number;
  requests: number;
  model: string;
}

interface DailyUsageStats {
  date: string;
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  averageTokensPerRequest: number;
}

interface OptimizationRecommendation {
  level: 'high' | 'medium' | 'low';
  liveBudget: number;
  summaryRatio: number;
  aggressiveSummary: boolean;
  reasoning: string;
  projectedSavings: {
    tokenReduction: number;
    costReduction: number;
  };
}

interface UsageAnalysis {
  averageDailyTokens: number;
  averageDailyCost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  peakUsageDays: string[];
  recommendation: OptimizationRecommendation;
}

export class UsageOptimizer {
  private metricsCache: UsageMetric[] = [];
  private lastCacheUpdate: number = 0;
  private optimizationCache = new Map<string, { result: OptimizationRecommendation; timestamp: number }>();

  /**
   * Ana optimizasyon fonksiyonu
   */
  async optimizeUsage(forceRefresh = false): Promise<OptimizationRecommendation> {
    try {
      const cacheKey = 'optimization_result';
      const cached = this.optimizationCache.get(cacheKey);
      
      // Cache kontrolü
      if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_CONFIG.OPTIMIZATION_CACHE_TTL) {
        console.log('📊 Usage optimizer cache hit');
        return cached.result;
      }

      // Kullanım verilerini analiz et
      const analysis = await this.analyzeUsage();
      
      // Optimizasyon seviyesini belirle
      const recommendation = this.calculateOptimizationLevel(analysis);
      
      // Cache'e kaydet
      this.optimizationCache.set(cacheKey, {
        result: recommendation,
        timestamp: Date.now()
      });

      // Store'a kaydet
      await store.updateOptimizationLevel(recommendation.level);

      console.log(`🎯 Usage optimization completed: ${recommendation.level} level`);
      return recommendation;
    } catch (error) {
      console.error('❌ Usage optimization failed:', error);
      
      // Fallback olarak medium level döndür
      return {
        level: 'medium',
        liveBudget: USAGE_OPTIMIZER_CONFIG.LEVELS.MEDIUM.liveBudget,
        summaryRatio: USAGE_OPTIMIZER_CONFIG.LEVELS.MEDIUM.summaryRatio,
        aggressiveSummary: USAGE_OPTIMIZER_CONFIG.LEVELS.MEDIUM.aggressiveSummary,
        reasoning: 'Fallback optimization due to analysis error',
        projectedSavings: {
          tokenReduction: 0,
          costReduction: 0
        }
      };
    }
  }

  /**
   * Kullanım verilerini analiz et
   */
  async analyzeUsage(): Promise<UsageAnalysis> {
    // Mevcut store verilerini al
    const settings = await store.loadSettings();
    const usage = settings.usage;

    if (!usage || !usage.lastReset) {
      return this.createDefaultAnalysis();
    }

    // Son N günlük veri simülasyonu (gerçek projede OpenAI API'den alınabilir)
    const dailyStats = await this.getDailyUsageStats();
    
    const totalDays = dailyStats.length;
    const averageDailyTokens = totalDays > 0 
      ? dailyStats.reduce((sum, day) => sum + day.totalTokens, 0) / totalDays 
      : 0;
    
    const averageDailyCost = totalDays > 0
      ? dailyStats.reduce((sum, day) => sum + day.totalCost, 0) / totalDays
      : 0;

    // Trend analizi
    const trend = this.analyzeTrend(dailyStats);
    
    // Peak usage günlerini belirle
    const peakUsageDays = this.findPeakUsageDays(dailyStats);
    
    // Optimizasyon önerisi oluştur
    const recommendation = this.generateRecommendation(averageDailyTokens, averageDailyCost, trend);

    return {
      averageDailyTokens,
      averageDailyCost,
      trend,
      peakUsageDays,
      recommendation
    };
  }

  /**
   * Gerçek zamanlı kullanım metriği ekle
   */
  addUsageMetric(tokens: number, cost: number, model: string): void {
    const metric: UsageMetric = {
      date: new Date(),
      tokens,
      cost,
      requests: 1,
      model
    };

    this.metricsCache.push(metric);
    
    // Cache boyutunu sınırla
    if (this.metricsCache.length > 1000) {
      this.metricsCache = this.metricsCache.slice(-1000);
    }

    // Store'daki usage stats'ı güncelle
    store.updateUsageStats(tokens, cost).catch(error => {
      console.error('❌ Usage stats update failed:', error);
    });
  }

  /**
   * Maliyet projeksiyonu hesapla
   */
  calculateCostProjection(
    currentDailyTokens: number,
    optimizationLevel: 'high' | 'medium' | 'low'
  ): {
    currentMonthlyCost: number;
    optimizedMonthlyCost: number;
    savings: number;
    savingsPercentage: number;
  } {
    const tokensPerMonth = currentDailyTokens * 30;
    const currentMonthlyCost = this.calculateTokenCost(tokensPerMonth);
    
    const config = USAGE_OPTIMIZER_CONFIG.LEVELS[optimizationLevel.toUpperCase() as keyof typeof USAGE_OPTIMIZER_CONFIG.LEVELS];
    const reductionRatio = 1 - config.summaryRatio;
    
    const optimizedTokens = tokensPerMonth * reductionRatio;
    const optimizedMonthlyCost = this.calculateTokenCost(optimizedTokens);
    
    const savings = currentMonthlyCost - optimizedMonthlyCost;
    const savingsPercentage = currentMonthlyCost > 0 
      ? Math.round((savings / currentMonthlyCost) * 100)
      : 0;

    return {
      currentMonthlyCost,
      optimizedMonthlyCost,
      savings,
      savingsPercentage
    };
  }

  /**
   * Optimizer istatistikleri
   */
  getOptimizerStats(): {
    cacheSize: number;
    lastOptimization: Date | null;
    metricsCount: number;
    currentLevel: string | null;
  } {
    return {
      cacheSize: this.optimizationCache.size,
      lastOptimization: this.lastCacheUpdate > 0 ? new Date(this.lastCacheUpdate) : null,
      metricsCount: this.metricsCache.length,
      currentLevel: null // Store'dan alınacak
    };
  }

  /**
   * Cache'i temizle
   */
  clearCache(): void {
    this.optimizationCache.clear();
    this.metricsCache = [];
    this.lastCacheUpdate = 0;
  }

  /**
   * Günlük kullanım istatistikleri (simüle edilmiş)
   */
  private async getDailyUsageStats(): Promise<DailyUsageStats[]> {
    const settings = await store.loadSettings();
    const usage = settings.usage;
    
    if (!usage) {
      return [];
    }

    // Son 7 günlük veri simülasyonu
    const stats: DailyUsageStats[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simüle edilmiş günlük kullanım
      const dailyTokens = Math.floor(usage.totalTokensUsed / 7) + Math.random() * 5000;
      const dailyCost = this.calculateTokenCost(dailyTokens);
      const dailyRequests = Math.floor(usage.requestCount / 7) + Math.random() * 50;
      
      stats.push({
        date: date.toISOString().split('T')[0],
        totalTokens: dailyTokens,
        totalCost: dailyCost,
        totalRequests: dailyRequests,
        averageTokensPerRequest: dailyRequests > 0 ? Math.round(dailyTokens / dailyRequests) : 0
      });
    }
    
    return stats;
  }

  /**
   * Trend analizi
   */
  private analyzeTrend(dailyStats: DailyUsageStats[]): 'increasing' | 'decreasing' | 'stable' {
    if (dailyStats.length < 3) return 'stable';
    
    const firstHalf = dailyStats.slice(0, Math.floor(dailyStats.length / 2));
    const secondHalf = dailyStats.slice(Math.floor(dailyStats.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.totalTokens, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.totalTokens, 0) / secondHalf.length;
    
    const changePercentage = Math.abs((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    if (changePercentage < 10) return 'stable';
    return secondHalfAvg > firstHalfAvg ? 'increasing' : 'decreasing';
  }

  /**
   * Peak usage günlerini bul
   */
  private findPeakUsageDays(dailyStats: DailyUsageStats[]): string[] {
    if (dailyStats.length === 0) return [];
    
    const avgTokens = dailyStats.reduce((sum, day) => sum + day.totalTokens, 0) / dailyStats.length;
    const threshold = avgTokens * 1.5; // %50 üzeri peak sayılır
    
    return dailyStats
      .filter(day => day.totalTokens > threshold)
      .map(day => day.date);
  }

  /**
   * Optimizasyon seviyesini hesapla
   */
  private calculateOptimizationLevel(analysis: UsageAnalysis): OptimizationRecommendation {
    const { averageDailyTokens, trend } = analysis;
    
    let level: 'high' | 'medium' | 'low';
    let reasoning: string;
    
    if (averageDailyTokens > USAGE_OPTIMIZER_CONFIG.HIGH_USAGE_THRESHOLD) {
      level = 'high';
      reasoning = `Yüksek günlük kullanım (${averageDailyTokens.toFixed(0)} token/gün) tespit edildi. Agresif optimizasyon öneriliyor.`;
    } else if (averageDailyTokens > USAGE_OPTIMIZER_CONFIG.MEDIUM_USAGE_THRESHOLD) {
      level = 'medium';
      reasoning = `Orta seviye günlük kullanım (${averageDailyTokens.toFixed(0)} token/gün). Dengeli optimizasyon uygulanıyor.`;
    } else {
      level = 'low';
      reasoning = `Düşük günlük kullanım (${averageDailyTokens.toFixed(0)} token/gün). Hafif optimizasyon yeterli.`;
    }
    
    // Trend'e göre ayarlama
    if (trend === 'increasing') {
      reasoning += ' Artan kullanım trendi nedeniyle daha agresif optimizasyon öneriliyor.';
    }
    
    const config = USAGE_OPTIMIZER_CONFIG.LEVELS[level.toUpperCase() as keyof typeof USAGE_OPTIMIZER_CONFIG.LEVELS];
    const projection = this.calculateCostProjection(averageDailyTokens, level);
    
    return {
      level,
      liveBudget: config.liveBudget,
      summaryRatio: config.summaryRatio,
      aggressiveSummary: config.aggressiveSummary,
      reasoning,
      projectedSavings: {
        tokenReduction: Math.round((1 - config.summaryRatio) * averageDailyTokens * 30),
        costReduction: projection.savings
      }
    };
  }

  /**
   * Önerі oluştur
   */
  private generateRecommendation(
    averageDailyTokens: number,
    averageDailyCost: number,
    trend: 'increasing' | 'decreasing' | 'stable'
  ): OptimizationRecommendation {
    return this.calculateOptimizationLevel({
      averageDailyTokens,
      averageDailyCost,
      trend,
      peakUsageDays: [],
      recommendation: {} as OptimizationRecommendation
    });
  }

  /**
   * Default analiz oluştur
   */
  private createDefaultAnalysis(): UsageAnalysis {
    const defaultRecommendation: OptimizationRecommendation = {
      level: 'medium',
      liveBudget: USAGE_OPTIMIZER_CONFIG.LEVELS.MEDIUM.liveBudget,
      summaryRatio: USAGE_OPTIMIZER_CONFIG.LEVELS.MEDIUM.summaryRatio,
      aggressiveSummary: USAGE_OPTIMIZER_CONFIG.LEVELS.MEDIUM.aggressiveSummary,
      reasoning: 'Yeterli kullanım verisi yok, varsayılan orta seviye optimizasyon uygulanıyor.',
      projectedSavings: {
        tokenReduction: 0,
        costReduction: 0
      }
    };

    return {
      averageDailyTokens: 0,
      averageDailyCost: 0,
      trend: 'stable',
      peakUsageDays: [],
      recommendation: defaultRecommendation
    };
  }

  /**
   * Token maliyeti hesapla (GPT-4o mini)
   */
  private calculateTokenCost(tokens: number): number {
    // GPT-4o mini pricing (approximate)
    const inputTokenPrice = 0.00015 / 1000; // per token
    const outputTokenPrice = 0.0006 / 1000; // per token
    
    // Assuming 50/50 input/output ratio
    return tokens * ((inputTokenPrice + outputTokenPrice) / 2);
  }
}

// Singleton instance
export const usageOptimizer = new UsageOptimizer();