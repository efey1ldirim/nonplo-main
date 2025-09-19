/**
 * Context Manager Configuration
 * Production-ready ayarlar for GPT-4o mini agents
 */

// Token budget ayarları
export const TOKEN_LIMITS = {
  // GPT-4o mini context limit
  GPT_4O_MINI_CONTEXT: 128000,
  
  // Default live budget (canlı tutulacak token sayısı)
  LIVE_BUDGET_DEFAULT: 12000,
  
  // Hard cap (maksimum context limiti)
  HARD_CAP_DEFAULT: 120000,
  
  // Güvenlik marjı
  SAFETY_MARGIN: 3000,
  
  // Özetleme hedef boyutu
  SUMMARY_CHUNK_TARGET: 2000,
  
  // Minimum mesaj sayısı (bu sayıdan az mesaj varsa özetleme yapma)
  MIN_MESSAGES_FOR_SUMMARY: 5
} as const;

// Model konfigürasyonu
export const MODELS = {
  // Ana chat modeli
  CHAT_MODEL: 'gpt-4o-mini',
  
  // Özetleme modeli (ekonomik)
  SUMMARY_MODEL: 'gpt-4o-mini',
  
  // Analiz modeli
  ANALYSIS_MODEL: 'gpt-4o-mini'
} as const;

// Cache ayarları
export const CACHE_CONFIG = {
  // Optimizasyon sonuçları cache süresi (1 saat)
  OPTIMIZATION_CACHE_TTL: 60 * 60 * 1000,
  
  // Token sayımı cache süresi (10 dakika)
  TOKEN_COUNT_CACHE_TTL: 10 * 60 * 1000,
  
  // Özet cache süresi (30 dakika)
  SUMMARY_CACHE_TTL: 30 * 60 * 1000
} as const;

// Usage optimizer ayarları
export const USAGE_OPTIMIZER_CONFIG = {
  // Yüksek kullanım eşiği (günlük)
  HIGH_USAGE_THRESHOLD: 50000,
  
  // Orta kullanım eşiği (günlük) 
  MEDIUM_USAGE_THRESHOLD: 15000,
  
  // Son N gün analiz edilecek
  ANALYSIS_DAYS: 7,
  
  // Optimizasyon seviyeleri
  LEVELS: {
    HIGH: {
      liveBudget: 8000,
      summaryRatio: 0.6, // %60 özetleme
      aggressiveSummary: true
    },
    MEDIUM: {
      liveBudget: 10000,
      summaryRatio: 0.65, // %65 özetleme
      aggressiveSummary: false
    },
    LOW: {
      liveBudget: 15000,
      summaryRatio: 0.8, // %80 özetleme
      aggressiveSummary: false
    }
  }
} as const;

// Özetleme ayarları
export const SUMMARY_CONFIG = {
  // Q&A format template
  QA_TEMPLATE: `Aşağıdaki mesajları Q&A formatında özetle. Her önemli soru ve cevabı kısa ve öz şekilde belirt:

Q: [Soru]
A: [Cevap]

Sadece önemli bilgileri koru, gereksiz detayları çıkar.`,

  // Maksimum özet token sayısı
  MAX_SUMMARY_TOKENS: 2000,
  
  // Temperature ayarı
  TEMPERATURE: 0.3, // Daha deterministik özetler için düşük
  
  // Maksimum output token
  MAX_OUTPUT_TOKENS: 1500
} as const;

// PII maskeleme patterns
export const PII_PATTERNS = {
  EMAIL: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[email]'
  },
  PHONE: {
    pattern: /(\+90|0)?\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}/g,
    replacement: '[phone]'
  },
  IBAN: {
    pattern: /TR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/g,
    replacement: '[iban]'
  },
  TC_ID: {
    pattern: /\b\d{11}\b/g,
    replacement: '[id]'
  },
  CREDIT_CARD: {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: '[card]'
  }
} as const;

// Store ayarları
export const STORE_CONFIG = {
  // Settings dosya yolu
  SETTINGS_FILE: 'cache/context-manager.json',
  
  // Backup dosya yolu
  BACKUP_FILE: 'cache/context-manager-backup.json',
  
  // Default ayarlar
  DEFAULT_SETTINGS: {
    enabled: true,
    liveBudget: TOKEN_LIMITS.LIVE_BUDGET_DEFAULT,
    hardCap: TOKEN_LIMITS.HARD_CAP_DEFAULT,
    autoOptimize: true,
    enablePiiStripping: true,
    debugMode: false
  }
} as const;

// Diagnostics ayarları
export const DIAGNOSTICS_CONFIG = {
  // Log level
  LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  // Detaylı diagnostics
  DETAILED_LOGS: process.env.NODE_ENV !== 'production',
  
  // Performance tracking
  TRACK_PERFORMANCE: true
} as const;

// Error ayarları
export const ERROR_CONFIG = {
  // Retry ayarları
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // ms
  
  // Fallback ayarları
  ENABLE_FALLBACK: true,
  
  // Error reporting
  REPORT_ERRORS: process.env.NODE_ENV === 'production'
} as const;