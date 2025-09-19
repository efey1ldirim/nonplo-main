/**
 * Summarizer Module
 * Eski mesajları Q&A formatında özetleme
 */

import OpenAI from 'openai';
import { SUMMARY_CONFIG, MODELS, CACHE_CONFIG } from './config';
import { privacy } from './privacy';
import { tokenizer } from './tokenizer';

interface SummaryRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
  }>;
  targetTokens?: number;
  preserveContext?: boolean;
  language?: 'tr' | 'en';
}

interface SummaryResult {
  summary: string;
  originalTokens: number;
  summaryTokens: number;
  compressionRatio: number;
  piiRemoved: number;
  messagesProcessed: number;
  processingTime: number;
}

interface SummaryChunk {
  messages: SummaryRequest['messages'];
  tokens: number;
  startIndex: number;
  endIndex: number;
}

export class Summarizer {
  private openai: OpenAI;
  private summaryCache = new Map<string, { result: SummaryResult; timestamp: number }>();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Ana özetleme fonksiyonu
   */
  async summarizeMessages(request: SummaryRequest): Promise<SummaryResult> {
    const startTime = Date.now();
    
    try {
      // Cache kontrolü
      const cacheKey = this.createCacheKey(request);
      const cached = this.summaryCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.SUMMARY_CACHE_TTL) {
        console.log('📝 Summary cache hit');
        return cached.result;
      }

      // Mesajları hazırla ve temizle
      const { cleanedMessages, piiCount } = await this.prepareMessages(request.messages);
      
      if (cleanedMessages.length === 0) {
        return this.createEmptyResult(startTime);
      }

      // Token sayımı
      const originalTokens = tokenizer.countMessagesTokens(
        cleanedMessages.map(msg => ({ ...msg, tokens: 0 }))
      ).totalTokens;

      // Çok büyük konuşmalar için chunk'lara böl
      const chunks = this.createChunks(cleanedMessages, request.targetTokens);
      
      // Her chunk'ı özetle
      const chunkSummaries: string[] = [];
      for (const chunk of chunks) {
        const chunkSummary = await this.summarizeChunk(
          chunk.messages,
          request.language || 'tr'
        );
        chunkSummaries.push(chunkSummary);
      }

      // Chunk summary'leri birleştir
      const finalSummary = await this.consolidateSummaries(
        chunkSummaries,
        request.language || 'tr'
      );

      // Final token sayımı
      const summaryTokens = tokenizer.countTokens(finalSummary).tokens;
      const compressionRatio = originalTokens > 0 ? summaryTokens / originalTokens : 0;

      const result: SummaryResult = {
        summary: finalSummary,
        originalTokens,
        summaryTokens,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        piiRemoved: piiCount,
        messagesProcessed: cleanedMessages.length,
        processingTime: Date.now() - startTime
      };

      // Cache'e kaydet
      this.summaryCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      console.log(`📝 Summary completed: ${originalTokens} → ${summaryTokens} tokens (${Math.round((1-compressionRatio)*100)}% reduction)`);
      return result;

    } catch (error) {
      console.error('❌ Summarization failed:', error);
      throw new Error(`Özetleme hatası: ${error}`);
    }
  }

  /**
   * Hızlı özetleme (daha az detaylı)
   */
  async quickSummarize(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens = 500
  ): Promise<string> {
    try {
      if (messages.length === 0) return '';

      const { cleanedMessages } = await this.prepareMessages(messages);
      const conversationText = this.formatMessagesForSummary(cleanedMessages);

      const response = await this.openai.chat.completions.create({
        model: MODELS.SUMMARY_MODEL,
        messages: [
          {
            role: 'system',
            content: `Aşağıdaki konuşmayı çok kısa ve öz bir şekilde özetle. Maksimum ${maxTokens} token kullan. Sadece ana noktaları belirt.`
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        temperature: SUMMARY_CONFIG.TEMPERATURE,
        max_tokens: Math.min(maxTokens, 1000)
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('❌ Quick summary failed:', error);
      return 'Özet oluşturulamadı.';
    }
  }

  /**
   * Özetleme performans istatistikleri
   */
  getSummarizerStats(): {
    cacheSize: number;
    totalSummaries: number;
    averageCompressionRatio: number;
    totalProcessingTime: number;
  } {
    const cached = Array.from(this.summaryCache.values());
    
    return {
      cacheSize: this.summaryCache.size,
      totalSummaries: cached.length,
      averageCompressionRatio: cached.length > 0 
        ? cached.reduce((sum, item) => sum + item.result.compressionRatio, 0) / cached.length
        : 0,
      totalProcessingTime: cached.reduce((sum, item) => sum + item.result.processingTime, 0)
    };
  }

  /**
   * Cache'i temizle
   */
  clearCache(): void {
    this.summaryCache.clear();
  }

  /**
   * Mesajları hazırla ve PII temizle
   */
  private async prepareMessages(
    messages: SummaryRequest['messages']
  ): Promise<{
    cleanedMessages: SummaryRequest['messages'];
    piiCount: number;
  }> {
    const cleanedMessages: SummaryRequest['messages'] = [];
    let totalPiiCount = 0;

    for (const message of messages) {
      if (!message.content || message.content.trim().length === 0) {
        continue;
      }

      // PII temizle
      const piiResult = privacy.stripPII(message.content);
      totalPiiCount += piiResult.detectedPII.reduce((sum, pii) => sum + pii.count, 0);

      cleanedMessages.push({
        ...message,
        content: piiResult.cleanedText
      });
    }

    return {
      cleanedMessages,
      piiCount: totalPiiCount
    };
  }

  /**
   * Mesajları chunk'lara böl
   */
  private createChunks(
    messages: SummaryRequest['messages'],
    targetTokens?: number
  ): SummaryChunk[] {
    const maxChunkTokens = targetTokens || SUMMARY_CONFIG.MAX_SUMMARY_TOKENS;
    const chunks: SummaryChunk[] = [];
    
    let currentChunk: SummaryRequest['messages'] = [];
    let currentTokens = 0;
    let startIndex = 0;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageTokens = tokenizer.countTokens(message.content).tokens;

      if (currentTokens + messageTokens > maxChunkTokens && currentChunk.length > 0) {
        // Mevcut chunk'ı kaydet
        chunks.push({
          messages: [...currentChunk],
          tokens: currentTokens,
          startIndex,
          endIndex: i - 1
        });

        // Yeni chunk başlat
        currentChunk = [message];
        currentTokens = messageTokens;
        startIndex = i;
      } else {
        currentChunk.push(message);
        currentTokens += messageTokens;
      }
    }

    // Son chunk'ı ekle
    if (currentChunk.length > 0) {
      chunks.push({
        messages: currentChunk,
        tokens: currentTokens,
        startIndex,
        endIndex: messages.length - 1
      });
    }

    return chunks;
  }

  /**
   * Tek bir chunk'ı özetle
   */
  private async summarizeChunk(
    messages: SummaryRequest['messages'],
    language: 'tr' | 'en'
  ): Promise<string> {
    const conversationText = this.formatMessagesForSummary(messages);
    
    const systemPrompt = language === 'tr' 
      ? SUMMARY_CONFIG.QA_TEMPLATE
      : `Summarize the following messages in Q&A format. Keep each important question and answer brief and concise:

Q: [Question]
A: [Answer]

Only keep important information, remove unnecessary details.`;

    const response = await this.openai.chat.completions.create({
      model: MODELS.SUMMARY_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: conversationText
        }
      ],
      temperature: SUMMARY_CONFIG.TEMPERATURE,
      max_tokens: SUMMARY_CONFIG.MAX_OUTPUT_TOKENS
    });

    return response.choices[0].message.content || '';
  }

  /**
   * Birden fazla özeti birleştir
   */
  private async consolidateSummaries(
    summaries: string[],
    language: 'tr' | 'en'
  ): Promise<string> {
    if (summaries.length === 1) {
      return summaries[0];
    }

    const combinedSummaries = summaries.join('\n\n---\n\n');
    
    const systemPrompt = language === 'tr'
      ? 'Aşağıdaki özetleri tek bir tutarlı özet halinde birleştir. Tekrar eden bilgileri kaldır ve ana noktaları koru:'
      : 'Consolidate the following summaries into one coherent summary. Remove duplicate information and keep the main points:';

    const response = await this.openai.chat.completions.create({
      model: MODELS.SUMMARY_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: combinedSummaries
        }
      ],
      temperature: SUMMARY_CONFIG.TEMPERATURE,
      max_tokens: SUMMARY_CONFIG.MAX_OUTPUT_TOKENS
    });

    return response.choices[0].message.content || combinedSummaries;
  }

  /**
   * Mesajları özetleme için formatla
   */
  private formatMessagesForSummary(messages: SummaryRequest['messages']): string {
    return messages
      .map(msg => {
        const roleText = msg.role === 'user' ? 'Kullanıcı' : 
                        msg.role === 'assistant' ? 'Asistan' : 'Sistem';
        return `${roleText}: ${msg.content}`;
      })
      .join('\n\n');
  }

  /**
   * Cache key oluştur
   */
  private createCacheKey(request: SummaryRequest): string {
    const content = request.messages.map(m => m.content).join('|');
    const settings = `${request.targetTokens || 0}-${request.language || 'tr'}`;
    
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content + settings).digest('hex');
  }

  /**
   * Boş sonuç oluştur
   */
  private createEmptyResult(startTime: number): SummaryResult {
    return {
      summary: '',
      originalTokens: 0,
      summaryTokens: 0,
      compressionRatio: 0,
      piiRemoved: 0,
      messagesProcessed: 0,
      processingTime: Date.now() - startTime
    };
  }
}

// Singleton instance
export const summarizer = new Summarizer();