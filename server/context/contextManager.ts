/**
 * Context Manager - Ana Yönetici Modül
 * OpenAI Assistant API'si ile uzun konuşmalarda token limitlerini yönetir
 */

import OpenAI from 'openai';
import { TOKEN_LIMITS, MODELS, DIAGNOSTICS_CONFIG } from './config';
import { tokenizer } from './tokenizer';
import { summarizer } from './summarizer';
import { usageOptimizer } from './usageOptimizer';
import { store } from './store';
import { privacy } from './privacy';
import { openaiCircuitBreaker, summarizerCircuitBreaker } from './circuitBreaker';
import { performanceMonitor } from './performanceMonitor';
import { cacheManager, CacheManager } from './cacheManager';

interface PrepareThreadRequest {
  threadId?: string;
  assistantId: string;
  newUserMessage: string;
  modelCtxLimit?: number;
  userId?: string;
  agentId?: string;
}

interface PrepareThreadResponse {
  threadId: string;
  action: 'passthrough' | 'reuse_thread' | 'new_thread_with_summary';
  summary?: string;
  diagnostics: {
    originalTokens: number;
    finalTokens: number;
    tokensReduced: number;
    reductionPercentage: number;
    messagesProcessed: number;
    piiRemoved: number;
    optimizationLevel: string;
    processingTime: number;
  };
  recommendation?: string;
}

interface ThreadAnalysis {
  totalTokens: number;
  messageCount: number;
  exceedsLimit: boolean;
  needsOptimization: boolean;
  oldestMessageDate?: Date;
  newestMessageDate?: Date;
}

export class ContextManager {
  private openai: OpenAI;
  private isEnabled: boolean = true;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.initializeSettings();
  }

  /**
   * Ana thread hazırlama fonksiyonu
   * Bu fonksiyon chat.ts'den çağrılacak
   */
  async prepareThreadForRun(request: PrepareThreadRequest): Promise<PrepareThreadResponse> {
    const startTime = Date.now();
    const timer = performanceMonitor.startTimer('prepareThreadForRun', request.userId);
    
    try {
      // Context Manager etkin mi kontrol et
      if (!this.isEnabled) {
        return this.createPassthroughResponse(request.threadId || '', startTime);
      }

      console.log(`🧠 Context Manager started for assistant ${request.assistantId.slice(0, 20)}...`);

      // Ayarları cache'den yükle
      const cacheKey = CacheManager.keys.systemSettings();
      let settings = cacheManager.get<any>(cacheKey);
      
      if (!settings) {
        settings = await store.loadSettings();
        cacheManager.set(cacheKey, settings, 300000); // 5 minutes cache
      }
      
      if (!settings.enabled) {
        timer(true, 0); // Success but disabled
        return this.createPassthroughResponse(request.threadId || '', startTime);
      }

      // Thread analizi
      const threadAnalysis = await this.analyzeThread(request.threadId);
      
      // Eğer thread yok veya az mesaj varsa, direkt geçiş
      if (!request.threadId || !threadAnalysis.needsOptimization) {
        return this.createReuseThreadResponse(
          request.threadId || '',
          threadAnalysis,
          startTime
        );
      }

      // Usage optimizer'dan optimizasyon seviyesi al
      const optimization = await usageOptimizer.optimizeUsage();
      
      // Token budget hesapla
      const liveBudget = this.calculateLiveBudget(optimization.liveBudget, settings.liveBudget);
      const hardCap = settings.hardCap || TOKEN_LIMITS.HARD_CAP_DEFAULT;

      // Thread'deki mesajları analiz et
      const messages = await this.getThreadMessages(request.threadId);
      const { liveMessages, oldMessages } = this.splitMessagesByBudget(messages, liveBudget);

      // Eski mesajlar var mı ve özetleme gerekli mi?
      if (oldMessages.length === 0) {
        return this.createReuseThreadResponse(request.threadId, threadAnalysis, startTime);
      }

      // Eski mesajları özetle (circuit breaker ile korumalı)
      const summaryResult = await summarizerCircuitBreaker.execute(async () => {
        return await summarizer.summarizeMessages({
          messages: oldMessages,
          targetTokens: TOKEN_LIMITS.SUMMARY_CHUNK_TARGET,
          language: this.detectLanguage(request.newUserMessage)
        });
      });

      // Yeni thread oluştur
      const newThreadId = await this.createNewThreadWithSummary(
        summaryResult.summary,
        liveMessages,
        request.assistantId
      );

      // Usage tracking
      usageOptimizer.addUsageMetric(
        threadAnalysis.totalTokens,
        this.calculateCost(threadAnalysis.totalTokens),
        MODELS.CHAT_MODEL
      );

      // Diagnostics oluştur
      const diagnostics = {
        originalTokens: threadAnalysis.totalTokens,
        finalTokens: summaryResult.summaryTokens + tokenizer.countMessagesTokens(
          liveMessages.map(msg => ({ ...msg, tokens: 0 }))
        ).totalTokens,
        tokensReduced: threadAnalysis.totalTokens - summaryResult.summaryTokens,
        reductionPercentage: Math.round(((threadAnalysis.totalTokens - summaryResult.summaryTokens) / threadAnalysis.totalTokens) * 100),
        messagesProcessed: oldMessages.length + liveMessages.length,
        piiRemoved: summaryResult.piiRemoved,
        optimizationLevel: optimization.level,
        processingTime: Date.now() - startTime
      };

      console.log(`✅ Context Manager completed: ${diagnostics.originalTokens} → ${diagnostics.finalTokens} tokens (${diagnostics.reductionPercentage}% reduction)`);

      timer(true, diagnostics.originalTokens); // Success with token count
      return {
        threadId: newThreadId,
        action: 'new_thread_with_summary',
        summary: summaryResult.summary,
        diagnostics,
        recommendation: optimization.reasoning
      };

    } catch (error) {
      console.error('❌ Context Manager error:', error);
      timer(false, 0, error instanceof Error ? error.message : 'Unknown error');
      
      // Hata durumunda passthrough yap
      return this.createPassthroughResponse(
        request.threadId || '',
        startTime,
        `Context Manager hatası: ${error}`
      );
    }
  }

  /**
   * Context Manager'ı aç/kapat
   */
  async toggleEnabled(enabled: boolean): Promise<any> {
    try {
      await store.toggleEnabled(enabled);
      this.isEnabled = enabled;
      
      // Invalidate cache after settings change
      cacheManager.invalidate('settings:system');
      cacheManager.invalidate('stats:system');
      
      const message = enabled 
        ? 'Context Manager etkinleştirildi'
        : 'Context Manager devre dışı bırakıldı';
      
      console.log(`🔄 ${message}`);
      
      // Return updated stats for frontend compatibility
      return await this.getStats();
    } catch (error) {
      console.error('❌ Context Manager toggle error:', error);
      throw error;
    }
  }

  /**
   * Context Manager istatistikleri (cache ile optimize edilmiş)
   */
  async getStats(): Promise<{
    enabled: boolean;
    settings: any;
    usage: any;
    tokenizer: any;
    summarizer: any;
    optimizer: any;
    performance: any;
    system: {
      cache: any;
      circuitBreaker: any;
      health: any;
    };
  }> {
    try {
      // Cache'den stats al (shape validation ile)
      const cacheKey = CacheManager.keys.systemStats();
      let cachedStats = cacheManager.get<any>(cacheKey);
      
      // Validate cached data has required shape
      if (!cachedStats || typeof cachedStats.enabled === 'undefined' || !cachedStats.settings) {
        const settings = await store.loadSettings();
        const storeStats = await store.getStoreStats();
        
        cachedStats = {
          enabled: this.isEnabled && settings.enabled,
          settings: {
            ...settings,
            storeStats
          },
          usage: settings.usage || {},
          tokenizer: tokenizer.getTokenizerStats(),
          summarizer: summarizer.getSummarizerStats(),
          optimizer: usageOptimizer.getOptimizerStats(),
        };
        
        cacheManager.set(cacheKey, cachedStats, 60000); // 1 minute cache for stats
      }
      
      // Real-time system stats (no cache)
      const performanceMetrics = performanceMonitor.getMetrics('prepareThreadForRun', 24);
      const systemHealth = performanceMonitor.getSystemHealth();
      const cacheStats = cacheManager.getStats();
      
      // Add top-level fields for frontend compatibility  
      const result = {
        ...cachedStats,
        // Frontend expects top-level liveBudget and hardCap
        liveBudget: cachedStats.settings?.liveBudget || 12000,
        hardCap: cachedStats.settings?.hardCap || 120000,
        performance: performanceMetrics.length > 0 ? performanceMetrics[0] : {
          operation: 'prepareThreadForRun',
          count: 0,
          avgDuration: 0,
          successRate: 100,
          p95Duration: 0,
          totalTokens: 0
        },
        system: {
          cache: cacheStats,
          circuitBreaker: {
            openai: openaiCircuitBreaker.getState(),
            summarizer: summarizerCircuitBreaker.getState()
          },
          health: systemHealth
        }
      };
      
      return result;
    } catch (error) {
      console.error('❌ Context Manager stats error:', error);
      throw error;
    }
  }

  /**
   * Manuel optimizasyon tetikle
   */
  async forceOptimization(): Promise<any> {
    try {
      console.log('🎯 Manual optimization triggered');
      return await usageOptimizer.optimizeUsage(true);
    } catch (error) {
      console.error('❌ Manual optimization error:', error);
      throw error;
    }
  }

  /**
   * Cache temizle
   */
  clearAllCaches(): void {
    tokenizer.cleanup();
    summarizer.clearCache();
    usageOptimizer.clearCache();
    store.clearCache();
    console.log('🧹 All caches cleared');
  }

  /**
   * Thread'i analiz et
   */
  private async analyzeThread(threadId?: string): Promise<ThreadAnalysis> {
    if (!threadId) {
      return {
        totalTokens: 0,
        messageCount: 0,
        exceedsLimit: false,
        needsOptimization: false
      };
    }

    try {
      const messages = await this.getThreadMessages(threadId);
      const analysis = tokenizer.analyzeAssistantMessages(messages);
      
      const settings = await store.loadSettings();
      const limit = settings.hardCap || TOKEN_LIMITS.HARD_CAP_DEFAULT;
      const needsOptimization = analysis.totalTokens > (settings.liveBudget || TOKEN_LIMITS.LIVE_BUDGET_DEFAULT);

      return {
        totalTokens: analysis.totalTokens,
        messageCount: analysis.messageCount,
        exceedsLimit: analysis.totalTokens > limit,
        needsOptimization: needsOptimization && analysis.messageCount >= TOKEN_LIMITS.MIN_MESSAGES_FOR_SUMMARY
      };
    } catch (error) {
      console.error('❌ Thread analysis error:', error);
      return {
        totalTokens: 0,
        messageCount: 0,
        exceedsLimit: false,
        needsOptimization: false
      };
    }
  }

  /**
   * Thread'deki mesajları al (circuit breaker ile korumalı)
   */
  private async getThreadMessages(threadId: string): Promise<any[]> {
    try {
      const response = await openaiCircuitBreaker.execute(async () => {
        return await this.openai.beta.threads.messages.list(threadId, {
          limit: 100, // Son 100 mesaj
          order: 'asc'
        });
      });
      
      return response.data || [];
    } catch (error) {
      console.error('❌ Error fetching thread messages:', error);
      return [];
    }
  }

  /**
   * Mesajları budget'a göre böl
   */
  private splitMessagesByBudget(
    messages: any[],
    liveBudget: number
  ): {
    liveMessages: any[];
    oldMessages: any[];
  } {
    const convertedMessages = messages.map(msg => ({
      role: msg.role,
      content: this.extractMessageContent(msg),
      tokens: 0
    }));

    const result = tokenizer.splitMessagesByBudget(convertedMessages, liveBudget);
    
    return {
      liveMessages: result.liveMessages,
      oldMessages: result.oldMessages
    };
  }

  /**
   * Özet ile yeni thread oluştur (circuit breaker ile korumalı)
   */
  private async createNewThreadWithSummary(
    summary: string,
    liveMessages: any[],
    assistantId: string
  ): Promise<string> {
    try {
      // Yeni thread oluştur (circuit breaker ile korumalı)
      const newThread = await openaiCircuitBreaker.execute(async () => {
        return await this.openai.beta.threads.create();
      });
      
      // Özeti system message olarak ekle
      if (summary && summary.trim()) {
        await openaiCircuitBreaker.execute(async () => {
          return await this.openai.beta.threads.messages.create(newThread.id, {
            role: 'user',
            content: `[KONUŞMA ÖZETİ - Bu özeti dikkate alarak konuşmaya devam et]\n\n${summary}`
          });
        });
      }

      // Canlı mesajları ekle
      for (const message of liveMessages) {
        await openaiCircuitBreaker.execute(async () => {
          return await this.openai.beta.threads.messages.create(newThread.id, {
            role: message.role,
            content: message.content
          });
        });
      }

      return newThread.id;
    } catch (error) {
      console.error('❌ Error creating new thread with summary:', error);
      throw error;
    }
  }

  /**
   * Live budget hesapla
   */
  private calculateLiveBudget(optimizerBudget: number, settingsBudget: number): number {
    // İkisinden küçük olanı kullan
    return Math.min(optimizerBudget, settingsBudget);
  }

  /**
   * Dil tespit et
   */
  private detectLanguage(text: string): 'tr' | 'en' {
    const turkishChars = /[çğıöşüÇĞIİÖŞÜ]/;
    const turkishWords = /(ve|ile|için|olan|olarak|bir|bu|şu|ne|nasıl)/i;
    
    if (turkishChars.test(text) || turkishWords.test(text)) {
      return 'tr';
    }
    return 'en';
  }

  /**
   * Mesaj içeriğini çıkar
   */
  private extractMessageContent(message: any): string {
    if (typeof message.content === 'string') {
      return message.content;
    }
    
    if (Array.isArray(message.content)) {
      return message.content
        .filter(item => item.type === 'text')
        .map(item => item.text?.value || item.text || '')
        .join(' ');
    }
    
    return message.content?.text?.value || '';
  }

  /**
   * Maliyet hesapla
   */
  private calculateCost(tokens: number): number {
    // GPT-4o mini pricing
    const pricePerToken = 0.000375 / 1000; // Average of input/output
    return tokens * pricePerToken;
  }

  /**
   * Passthrough response oluştur
   */
  private createPassthroughResponse(
    threadId: string,
    startTime: number,
    error?: string
  ): PrepareThreadResponse {
    return {
      threadId,
      action: 'passthrough',
      diagnostics: {
        originalTokens: 0,
        finalTokens: 0,
        tokensReduced: 0,
        reductionPercentage: 0,
        messagesProcessed: 0,
        piiRemoved: 0,
        optimizationLevel: 'none',
        processingTime: Date.now() - startTime
      },
      recommendation: error || 'Context Manager pasif durumda'
    };
  }

  /**
   * Reuse thread response oluştur
   */
  private createReuseThreadResponse(
    threadId: string,
    analysis: ThreadAnalysis,
    startTime: number
  ): PrepareThreadResponse {
    return {
      threadId,
      action: 'reuse_thread',
      diagnostics: {
        originalTokens: analysis.totalTokens,
        finalTokens: analysis.totalTokens,
        tokensReduced: 0,
        reductionPercentage: 0,
        messagesProcessed: analysis.messageCount,
        piiRemoved: 0,
        optimizationLevel: 'none',
        processingTime: Date.now() - startTime
      },
      recommendation: 'Mevcut thread yeterli, optimizasyon gerekmedi'
    };
  }

  /**
   * Ayarları initialize et
   */
  private async initializeSettings(): Promise<void> {
    try {
      const settings = await store.loadSettings();
      this.isEnabled = settings.enabled;
      
      if (DIAGNOSTICS_CONFIG.DETAILED_LOGS) {
        console.log('🧠 Context Manager initialized:', {
          enabled: this.isEnabled,
          liveBudget: settings.liveBudget,
          hardCap: settings.hardCap
        });
      }
    } catch (error) {
      console.error('❌ Context Manager initialization error:', error);
      this.isEnabled = false;
    }
  }
}

// Singleton instance
export const contextManager = new ContextManager();