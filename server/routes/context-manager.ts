/**
 * Context Manager API Routes
 * Context Manager'ı kontrol etmek için API endpoints
 */

import { Request, Response } from 'express';
import { contextManager } from '../context';
import { AuthenticatedRequest, getUserId } from '../middleware/auth';

/**
 * GET /api/context-manager/status
 * Context Manager durumunu kontrol et
 */
export const getContextManagerStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 Context Manager status requested');
    
    const stats = await contextManager.getStats();
    
    return res.status(200).json({
      success: true,
      data: {
        enabled: stats.enabled,
        status: stats.enabled ? 'active' : 'disabled',
        settings: stats.settings,
        usage: stats.usage,
        performance: stats.performance,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Context Manager status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Context Manager durumu alınamadı',
      details: error.message
    });
  }
};

/**
 * POST /api/context-manager/toggle
 * Context Manager'ı aç/kapat
 */
export const toggleContextManager = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled alanı boolean değer olmalıdır'
      });
    }

    console.log(`🔄 Context Manager toggle request: ${enabled}`);
    
    const result = await contextManager.toggleEnabled(enabled);
    
    return res.status(200).json({
      success: true,
      data: {
        enabled: result.enabled,
        message: result.message,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Context Manager toggle error:', error);
    return res.status(500).json({
      success: false,
      error: 'Context Manager durumu değiştirilemedi',
      details: error.message
    });
  }
};

/**
 * GET /api/context-manager/stats
 * Detaylı Context Manager istatistikleri
 */
export const getContextManagerStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📈 Context Manager detailed stats requested');
    
    const stats = await contextManager.getStats();
    
    // Kullanım projeksiyonları hesapla
    const projections = calculateUsageProjections(stats);
    
    return res.status(200).json({
      success: true,
      data: {
        overview: {
          enabled: stats.enabled,
          optimizationLevel: stats.settings.optimizationLevel || 'medium',
          lastOptimization: stats.settings.lastOptimization,
          totalTokensSaved: stats.performance.totalTokensSaved,
          averageReduction: stats.performance.averageReductionPercentage
        },
        settings: stats.settings,
        usage: stats.usage,
        components: {
          tokenizer: stats.tokenizer,
          summarizer: stats.summarizer,
          optimizer: stats.optimizer
        },
        projections,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Context Manager stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Context Manager istatistikleri alınamadı',
      details: error.message
    });
  }
};

/**
 * POST /api/context-manager/optimize
 * Manuel optimizasyon tetikle
 */
export const triggerOptimization = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🎯 Manual Context Manager optimization triggered');
    
    const optimization = await contextManager.forceOptimization();
    
    return res.status(200).json({
      success: true,
      data: {
        optimization,
        message: 'Optimizasyon başarıyla tamamlandı',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Context Manager optimization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Optimizasyon tetiklenemedi',
      details: error.message
    });
  }
};

/**
 * POST /api/context-manager/settings
 * Context Manager ayarlarını güncelle
 */
export const updateContextManagerSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { liveBudget, hardCap, autoOptimize, enablePiiStripping, debugMode } = req.body;
    
    console.log('⚙️ Context Manager settings update requested');
    
    // Ayarları doğrula
    const updates: any = {};
    
    if (liveBudget !== undefined) {
      if (typeof liveBudget !== 'number' || liveBudget < 1000 || liveBudget > 50000) {
        return res.status(400).json({
          success: false,
          error: 'liveBudget 1000-50000 arasında olmalıdır'
        });
      }
      updates.liveBudget = liveBudget;
    }
    
    if (hardCap !== undefined) {
      if (typeof hardCap !== 'number' || hardCap < 50000 || hardCap > 150000) {
        return res.status(400).json({
          success: false,
          error: 'hardCap 50000-150000 arasında olmalıdır'
        });
      }
      updates.hardCap = hardCap;
    }
    
    if (autoOptimize !== undefined) {
      if (typeof autoOptimize !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'autoOptimize boolean değer olmalıdır'
        });
      }
      updates.autoOptimize = autoOptimize;
    }
    
    if (enablePiiStripping !== undefined) {
      if (typeof enablePiiStripping !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'enablePiiStripping boolean değer olmalıdır'
        });
      }
      updates.enablePiiStripping = enablePiiStripping;
    }
    
    if (debugMode !== undefined) {
      if (typeof debugMode !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'debugMode boolean değer olmalıdır'
        });
      }
      updates.debugMode = debugMode;
    }

    // Store'a kaydet
    const { store } = await import('../context');
    await store.saveSettings(updates);
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Ayarlar başarıyla güncellendi',
        updatedFields: Object.keys(updates),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Context Manager settings update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ayarlar güncellenemedi',
      details: error.message
    });
  }
};

/**
 * POST /api/context-manager/clear-cache
 * Tüm cache'leri temizle
 */
export const clearContextManagerCache = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🧹 Context Manager cache clear requested');
    
    contextManager.clearAllCaches();
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Tüm cache\'ler temizlendi',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Context Manager cache clear error:', error);
    return res.status(500).json({
      success: false,
      error: 'Cache temizlenemedi',
      details: error.message
    });
  }
};

/**
 * GET /api/context-manager/health
 * Context Manager health check
 */
export const getContextManagerHealth = async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Temel sağlık kontrolü
    const stats = await contextManager.getStats();
    const responseTime = Date.now() - startTime;
    
    const health = {
      status: 'healthy',
      enabled: stats.enabled,
      responseTime,
      components: {
        contextManager: 'healthy',
        tokenizer: stats.tokenizer.encoderAvailable ? 'healthy' : 'degraded',
        store: stats.settings.storeStats?.settingsFileExists ? 'healthy' : 'warning',
        cache: 'healthy'
      },
      timestamp: new Date().toISOString()
    };
    
    const overallHealth = Object.values(health.components).some(status => status === 'degraded') 
      ? 'degraded' 
      : Object.values(health.components).some(status => status === 'warning')
      ? 'warning'
      : 'healthy';
    
    health.status = overallHealth;
    
    return res.status(200).json({
      success: true,
      data: health
    });
  } catch (error: any) {
    console.error('❌ Context Manager health check error:', error);
    return res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Kullanım projeksiyonları hesapla
 */
function calculateUsageProjections(stats: any): {
  daily: any;
  weekly: any;
  monthly: any;
} {
  const usage = stats.usage || {};
  const dailyTokens = usage.totalTokensUsed || 0;
  const dailyCost = usage.totalCost || 0;
  
  return {
    daily: {
      tokens: dailyTokens,
      cost: dailyCost,
      requests: usage.requestCount || 0
    },
    weekly: {
      tokens: dailyTokens * 7,
      cost: dailyCost * 7,
      requests: (usage.requestCount || 0) * 7
    },
    monthly: {
      tokens: dailyTokens * 30,
      cost: dailyCost * 30,
      requests: (usage.requestCount || 0) * 30
    }
  };
}