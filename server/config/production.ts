import crypto from 'crypto';

/**
 * Production Configuration
 * Environment variables ve production ayarları
 */

export interface ProductionConfig {
  googleCalendar: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    encryptionKey: Buffer;
  };
  database: {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
  };
  rateLimiting: {
    calendar: {
      requests: number;
      windowMs: number;
    };
    oauth: {
      requests: number;
      windowMs: number;
    };
  };
  monitoring: {
    errorThreshold: number;
    authErrorThreshold: number;
    alertCheckIntervalHours: number;
  };
  security: {
    cspDomains: string[];
  };
}

/**
 * Environment variables validation
 */
function validateEnvironmentVariables(): void {
  const required = [
    'GOOGLE_CALENDAR_CLIENT_ID',
    'GOOGLE_CALENDAR_CLIENT_SECRET', 
    'GOOGLE_CALENDAR_REDIRECT_URI',
    'CALENDAR_ENCRYPTION_KEY',
    'DATABASE_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate encryption key format (64 hex characters)
  const encryptionKey = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!encryptionKey || !/^[0-9a-f]{64}$/i.test(encryptionKey)) {
    throw new Error('CALENDAR_ENCRYPTION_KEY must be 64 hex characters');
  }
}

/**
 * Generate encryption key for calendar tokens
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Production configuration factory
 */
export function createProductionConfig(): ProductionConfig {
  if (process.env.NODE_ENV === 'production') {
    validateEnvironmentVariables();
  }

  return {
    googleCalendar: {
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || '',
      encryptionKey: Buffer.from(process.env.CALENDAR_ENCRYPTION_KEY || '', 'hex'),
    },
    database: {
      url: process.env.DATABASE_URL || '',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    },
    rateLimiting: {
      calendar: {
        requests: parseInt(process.env.CALENDAR_RATE_LIMIT_REQUESTS || '50'),
        windowMs: parseInt(process.env.CALENDAR_RATE_LIMIT_WINDOW_MS || '300000'),
      },
      oauth: {
        requests: parseInt(process.env.CALENDAR_OAUTH_RATE_LIMIT_REQUESTS || '10'),
        windowMs: parseInt(process.env.CALENDAR_OAUTH_RATE_LIMIT_WINDOW_MS || '3600000'),
      },
    },
    monitoring: {
      errorThreshold: parseFloat(process.env.CALENDAR_ERROR_THRESHOLD || '0.3'),
      authErrorThreshold: parseInt(process.env.CALENDAR_AUTH_ERROR_THRESHOLD || '5'),
      alertCheckIntervalHours: parseInt(process.env.CALENDAR_ALERT_CHECK_INTERVAL_HOURS || '1'),
    },
    security: {
      cspDomains: (process.env.CSP_GOOGLE_DOMAINS || 'https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com').split(' '),
    },
  };
}

/**
 * Development ortamında encryption key generation
 */
export function setupDevelopmentKeys(): void {
  if (process.env.NODE_ENV !== 'production' && !process.env.CALENDAR_ENCRYPTION_KEY) {
    const key = generateEncryptionKey();
    process.env.CALENDAR_ENCRYPTION_KEY = key;
    console.log('🔑 Generated development encryption key:', key);
    console.log('⚠️  Production\'da gerçek encryption key kullanın!');
  }
}

export const productionConfig = createProductionConfig();