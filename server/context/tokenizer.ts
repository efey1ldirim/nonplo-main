/**
 * Tokenizer Module
 * GPT-4o mini için token sayımı ve context limit kontrolleri
 */

import { encoding_for_model, Tiktoken } from 'tiktoken';
import { TOKEN_LIMITS, MODELS, CACHE_CONFIG } from './config';

interface TokenCount {
  tokens: number;
  characters: number;
  words: number;
}

interface MessageTokenInfo {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
}

interface ThreadTokenAnalysis {
  totalTokens: number;
  systemTokens: number;
  userTokens: number;
  assistantTokens: number;
  messageCount: number;
  averageTokensPerMessage: number;
  oldestMessageDate?: Date;
  newestMessageDate?: Date;
}

class TokenCache {
  private cache = new Map<string, { tokens: number; timestamp: number }>();

  set(key: string, tokens: number): void {
    this.cache.set(key, { tokens, timestamp: Date.now() });
    this.cleanup();
  }

  get(key: string): number | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_CONFIG.TOKEN_COUNT_CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.tokens;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > CACHE_CONFIG.TOKEN_COUNT_CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export class Tokenizer {
  private encoder: Tiktoken;
  private cache = new TokenCache();

  constructor() {
    try {
      this.encoder = encoding_for_model(MODELS.CHAT_MODEL as any);
    } catch (error) {
      console.warn('🔧 Tiktoken encoder oluşturulamadı, fallback kullanılıyor:', error);
      // Fallback için approximate calculation kullanacağız
      this.encoder = null as any;
    }
  }

  /**
   * Tek bir mesajın token sayısını hesapla
   */
  countTokens(text: string): TokenCount {
    if (!text) {
      return { tokens: 0, characters: 0, words: 0 };
    }

    const cacheKey = this.createCacheKey(text);
    const cachedTokens = this.cache.get(cacheKey);
    
    let tokens: number;
    
    if (cachedTokens !== null) {
      tokens = cachedTokens;
    } else {
      if (this.encoder) {
        try {
          tokens = this.encoder.encode(text).length;
        } catch (error) {
          console.warn('🔧 Token encoding hatası, fallback kullanılıyor:', error);
          tokens = this.approximateTokenCount(text);
        }
      } else {
        tokens = this.approximateTokenCount(text);
      }
      
      this.cache.set(cacheKey, tokens);
    }

    return {
      tokens,
      characters: text.length,
      words: text.split(/\s+/).filter(word => word.length > 0).length
    };
  }

  /**
   * Mesaj dizisinin token sayısını hesapla
   */
  countMessagesTokens(messages: MessageTokenInfo[]): ThreadTokenAnalysis {
    let totalTokens = 0;
    let systemTokens = 0;
    let userTokens = 0;
    let assistantTokens = 0;

    for (const message of messages) {
      const tokenCount = this.countTokens(message.content);
      message.tokens = tokenCount.tokens;
      totalTokens += tokenCount.tokens;

      // Token türüne göre ayır
      switch (message.role) {
        case 'system':
          systemTokens += tokenCount.tokens;
          break;
        case 'user':
          userTokens += tokenCount.tokens;
          break;
        case 'assistant':
          assistantTokens += tokenCount.tokens;
          break;
      }
    }

    return {
      totalTokens,
      systemTokens,
      userTokens,
      assistantTokens,
      messageCount: messages.length,
      averageTokensPerMessage: messages.length > 0 ? Math.round(totalTokens / messages.length) : 0
    };
  }

  /**
   * OpenAI Assistant API formatındaki mesajları analiz et
   */
  analyzeAssistantMessages(messages: any[]): ThreadTokenAnalysis {
    const convertedMessages: MessageTokenInfo[] = messages.map(msg => ({
      role: msg.role || 'user',
      content: this.extractTextContent(msg.content),
      tokens: 0 // countMessagesTokens içinde hesaplanacak
    }));

    return this.countMessagesTokens(convertedMessages);
  }

  /**
   * Context limitini kontrol et
   */
  checkContextLimit(tokenCount: number, customLimit?: number): {
    withinLimit: boolean;
    remainingTokens: number;
    utilizationPercentage: number;
    recommendation: 'ok' | 'warning' | 'critical';
  } {
    const limit = customLimit || TOKEN_LIMITS.GPT_4O_MINI_CONTEXT;
    const safeLimit = limit - TOKEN_LIMITS.SAFETY_MARGIN;
    
    const remainingTokens = safeLimit - tokenCount;
    const utilizationPercentage = Math.round((tokenCount / safeLimit) * 100);
    
    let recommendation: 'ok' | 'warning' | 'critical';
    if (utilizationPercentage < 70) {
      recommendation = 'ok';
    } else if (utilizationPercentage < 90) {
      recommendation = 'warning';
    } else {
      recommendation = 'critical';
    }

    return {
      withinLimit: tokenCount <= safeLimit,
      remainingTokens: Math.max(0, remainingTokens),
      utilizationPercentage,
      recommendation
    };
  }

  /**
   * Mesajları token budget'a göre böl
   */
  splitMessagesByBudget(
    messages: MessageTokenInfo[], 
    liveBudget: number
  ): {
    liveMessages: MessageTokenInfo[];
    oldMessages: MessageTokenInfo[];
    liveBudgetUsed: number;
    oldMessagesTokens: number;
  } {
    const liveMessages: MessageTokenInfo[] = [];
    const oldMessages: MessageTokenInfo[] = [];
    let liveBudgetUsed = 0;

    // Sondan başlayarak (en yeni mesajlardan) budget'ı doldur
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = message.tokens || this.countTokens(message.content).tokens;
      
      if (liveBudgetUsed + messageTokens <= liveBudget) {
        liveMessages.unshift(message);
        liveBudgetUsed += messageTokens;
      } else {
        oldMessages.unshift(message);
      }
    }

    const oldMessagesTokens = oldMessages.reduce(
      (sum, msg) => sum + (msg.tokens || this.countTokens(msg.content).tokens), 0
    );

    return {
      liveMessages,
      oldMessages,
      liveBudgetUsed,
      oldMessagesTokens
    };
  }

  /**
   * Özetleme için optimal chunk boyutu hesapla
   */
  calculateOptimalChunkSize(totalTokens: number): number {
    const targetChunks = Math.ceil(totalTokens / TOKEN_LIMITS.SUMMARY_CHUNK_TARGET);
    return Math.min(TOKEN_LIMITS.SUMMARY_CHUNK_TARGET, Math.ceil(totalTokens / targetChunks));
  }

  /**
   * OpenAI mesaj içeriğinden metin çıkar
   */
  private extractTextContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (Array.isArray(content)) {
      return content
        .filter(item => item.type === 'text')
        .map(item => item.text?.value || item.text || '')
        .join(' ');
    }
    
    if (content?.text?.value) {
      return content.text.value;
    }
    
    if (content?.text) {
      return content.text;
    }
    
    return '';
  }

  /**
   * Cache key oluştur
   */
  private createCacheKey(text: string): string {
    // Uzun metinler için hash kullan
    if (text.length > 1000) {
      const crypto = require('crypto');
      return crypto.createHash('md5').update(text).digest('hex');
    }
    return text;
  }

  /**
   * Tiktoken yoksa approximate token sayımı
   */
  private approximateTokenCount(text: string): number {
    // OpenAI'ın kaba tahmini: ~4 karakter = 1 token
    // Türkçe için biraz daha düşük oran kullanıyoruz
    const averageCharsPerToken = 3.5;
    return Math.ceil(text.length / averageCharsPerToken);
  }

  /**
   * Token hesaplama istatistikleri
   */
  getTokenizerStats(): {
    cacheSize: number;
    cacheHitRate: number;
    encoderAvailable: boolean;
  } {
    return {
      cacheSize: this.cache['cache'].size,
      cacheHitRate: 0, // Implementation için cache hit tracking eklenebilir
      encoderAvailable: !!this.encoder
    };
  }

  /**
   * Memory cleanup
   */
  cleanup(): void {
    this.cache['cleanup']();
    if (this.encoder) {
      try {
        this.encoder.free();
      } catch (error) {
        console.warn('🔧 Encoder cleanup hatası:', error);
      }
    }
  }
}

// Singleton instance
export const tokenizer = new Tokenizer();