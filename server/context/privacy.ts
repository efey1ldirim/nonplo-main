/**
 * Privacy Module
 * PII (Personally Identifiable Information) temizleme ve maskeleme
 */

import { PII_PATTERNS } from './config';

interface PIIDetectionResult {
  originalText: string;
  cleanedText: string;
  detectedPII: {
    type: string;
    count: number;
    examples: string[];
  }[];
  hasAnyPII: boolean;
}

interface PIIConfig {
  enableEmailMasking: boolean;
  enablePhoneMasking: boolean;
  enableIbanMasking: boolean;
  enableIdMasking: boolean;
  enableCreditCardMasking: boolean;
  customPatterns: Array<{
    name: string;
    pattern: RegExp;
    replacement: string;
  }>;
}

export class Privacy {
  private config: PIIConfig;

  constructor(customConfig?: Partial<PIIConfig>) {
    this.config = {
      enableEmailMasking: true,
      enablePhoneMasking: true,
      enableIbanMasking: true,
      enableIdMasking: true,
      enableCreditCardMasking: true,
      customPatterns: [],
      ...customConfig
    };
  }

  /**
   * Metinden PII'ları tespit et ve maskele
   */
  stripPII(text: string): PIIDetectionResult {
    if (!text || typeof text !== 'string') {
      return {
        originalText: text || '',
        cleanedText: text || '',
        detectedPII: [],
        hasAnyPII: false
      };
    }

    let cleanedText = text;
    const detectedPII: PIIDetectionResult['detectedPII'] = [];

    // E-mail adresleri
    if (this.config.enableEmailMasking) {
      const emailMatches = this.detectAndReplace(
        cleanedText,
        PII_PATTERNS.EMAIL.pattern,
        PII_PATTERNS.EMAIL.replacement
      );
      cleanedText = emailMatches.cleanedText;
      if (emailMatches.count > 0) {
        detectedPII.push({
          type: 'email',
          count: emailMatches.count,
          examples: emailMatches.examples.slice(0, 3) // İlk 3 örnek
        });
      }
    }

    // Telefon numaraları
    if (this.config.enablePhoneMasking) {
      const phoneMatches = this.detectAndReplace(
        cleanedText,
        PII_PATTERNS.PHONE.pattern,
        PII_PATTERNS.PHONE.replacement
      );
      cleanedText = phoneMatches.cleanedText;
      if (phoneMatches.count > 0) {
        detectedPII.push({
          type: 'phone',
          count: phoneMatches.count,
          examples: phoneMatches.examples.slice(0, 3)
        });
      }
    }

    // IBAN numaraları
    if (this.config.enableIbanMasking) {
      const ibanMatches = this.detectAndReplace(
        cleanedText,
        PII_PATTERNS.IBAN.pattern,
        PII_PATTERNS.IBAN.replacement
      );
      cleanedText = ibanMatches.cleanedText;
      if (ibanMatches.count > 0) {
        detectedPII.push({
          type: 'iban',
          count: ibanMatches.count,
          examples: ibanMatches.examples.slice(0, 3)
        });
      }
    }

    // TC Kimlik numaraları
    if (this.config.enableIdMasking) {
      const idMatches = this.detectAndReplace(
        cleanedText,
        PII_PATTERNS.TC_ID.pattern,
        PII_PATTERNS.TC_ID.replacement
      );
      cleanedText = idMatches.cleanedText;
      if (idMatches.count > 0) {
        detectedPII.push({
          type: 'tc_id',
          count: idMatches.count,
          examples: idMatches.examples.slice(0, 3)
        });
      }
    }

    // Kredi kartı numaraları
    if (this.config.enableCreditCardMasking) {
      const cardMatches = this.detectAndReplace(
        cleanedText,
        PII_PATTERNS.CREDIT_CARD.pattern,
        PII_PATTERNS.CREDIT_CARD.replacement
      );
      cleanedText = cardMatches.cleanedText;
      if (cardMatches.count > 0) {
        detectedPII.push({
          type: 'credit_card',
          count: cardMatches.count,
          examples: cardMatches.examples.slice(0, 3)
        });
      }
    }

    // Custom patterns
    for (const customPattern of this.config.customPatterns) {
      const customMatches = this.detectAndReplace(
        cleanedText,
        customPattern.pattern,
        customPattern.replacement
      );
      cleanedText = customMatches.cleanedText;
      if (customMatches.count > 0) {
        detectedPII.push({
          type: customPattern.name,
          count: customMatches.count,
          examples: customMatches.examples.slice(0, 3)
        });
      }
    }

    return {
      originalText: text,
      cleanedText,
      detectedPII,
      hasAnyPII: detectedPII.length > 0
    };
  }

  /**
   * Mesaj dizisini toplu olarak temizle
   */
  stripPIIFromMessages(messages: Array<{ role: string; content: string }>): {
    cleanedMessages: Array<{ role: string; content: string }>;
    totalPIIDetected: number;
    piiSummary: Record<string, number>;
  } {
    const cleanedMessages: Array<{ role: string; content: string }> = [];
    let totalPIIDetected = 0;
    const piiSummary: Record<string, number> = {};

    for (const message of messages) {
      const result = this.stripPII(message.content);
      
      cleanedMessages.push({
        role: message.role,
        content: result.cleanedText
      });

      // PII istatistiklerini topla
      for (const pii of result.detectedPII) {
        totalPIIDetected += pii.count;
        piiSummary[pii.type] = (piiSummary[pii.type] || 0) + pii.count;
      }
    }

    return {
      cleanedMessages,
      totalPIIDetected,
      piiSummary
    };
  }

  /**
   * Sadece kontrol et, temizleme yapma
   */
  detectPII(text: string): {
    hasPII: boolean;
    piiTypes: string[];
    totalMatches: number;
  } {
    const result = this.stripPII(text);
    
    return {
      hasPII: result.hasAnyPII,
      piiTypes: result.detectedPII.map(pii => pii.type),
      totalMatches: result.detectedPII.reduce((sum, pii) => sum + pii.count, 0)
    };
  }

  /**
   * Özel PII pattern ekle
   */
  addCustomPattern(name: string, pattern: RegExp, replacement: string): void {
    this.config.customPatterns.push({
      name,
      pattern,
      replacement
    });
  }

  /**
   * PII maskeleme ayarlarını güncelle
   */
  updateConfig(newConfig: Partial<PIIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Mevcut yapılandırmayı al
   */
  getConfig(): PIIConfig {
    return { ...this.config };
  }

  /**
   * PII temizleme istatistikleri
   */
  getStats(): {
    enabledPatterns: number;
    customPatterns: number;
    supportedPIITypes: string[];
  } {
    const enabledPatterns = [
      this.config.enableEmailMasking,
      this.config.enablePhoneMasking,
      this.config.enableIbanMasking,
      this.config.enableIdMasking,
      this.config.enableCreditCardMasking
    ].filter(Boolean).length;

    return {
      enabledPatterns,
      customPatterns: this.config.customPatterns.length,
      supportedPIITypes: [
        'email',
        'phone',
        'iban',
        'tc_id',
        'credit_card',
        ...this.config.customPatterns.map(p => p.name)
      ]
    };
  }

  /**
   * Pattern tespiti ve değiştirme yardımcı fonksiyonu
   */
  private detectAndReplace(
    text: string,
    pattern: RegExp,
    replacement: string
  ): {
    cleanedText: string;
    count: number;
    examples: string[];
  } {
    const matches = text.match(pattern) || [];
    const examples = [...new Set(matches)]; // Duplicate'ları kaldır
    
    return {
      cleanedText: text.replace(pattern, replacement),
      count: matches.length,
      examples
    };
  }

  /**
   * TC Kimlik numarası geçerlilik kontrolü
   */
  private isValidTCID(id: string): boolean {
    if (id.length !== 11) return false;
    if (id[0] === '0') return false;
    
    const digits = id.split('').map(Number);
    
    // Checksum algoritması
    const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    
    const check1 = (sum1 * 7 - sum2) % 10;
    const check2 = (sum1 + sum2 + check1) % 10;
    
    return check1 === digits[9] && check2 === digits[10];
  }

  /**
   * IBAN geçerlilik kontrolü
   */
  private isValidIBAN(iban: string): boolean {
    // Temel IBAN format kontrolü
    const cleanIban = iban.replace(/\s/g, '');
    if (!cleanIban.startsWith('TR') || cleanIban.length !== 26) {
      return false;
    }
    
    // MOD-97 kontrolü (basitleştirilmiş)
    return /^TR\d{24}$/.test(cleanIban);
  }
}

// Singleton instance with default config
export const privacy = new Privacy();