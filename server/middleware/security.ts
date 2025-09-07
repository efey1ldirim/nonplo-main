import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Security headers middleware with optimized configuration
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite dev
        "'unsafe-eval'", // Required for React dev
        "https://cdn.jsdelivr.net",
        "https://unpkg.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://*.supabase.co", // Supabase Storage
        "https://images.unsplash.com" // If using Unsplash
      ],
      connectSrc: [
        "'self'",
        "https://*.supabase.co", // Supabase API
        "https://api.openai.com", // OpenAI API
        "wss://*.supabase.co", // Supabase Realtime
        process.env.NODE_ENV === 'development' ? "ws://localhost:*" : null
      ].filter(Boolean),
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // X-Content-Type-Options
  noSniff: true,

  // Referrer Policy
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin']
  },

  // X-XSS-Protection (for older browsers)
  xssFilter: true
});

/**
 * CORS configuration
 */
export const corsConfig = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'https://*.replit.app',
      'https://*.replit.dev',
      process.env.FRONTEND_URL,
      process.env.REPLIT_DOMAIN ? `https://${process.env.REPLIT_DOMAIN}` : null
    ].filter(Boolean);

    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin?.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Client-Version'
  ],
  maxAge: 86400 // 24 hours
};

/**
 * Request sanitization middleware
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Remove potentially dangerous characters from query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = value.replace(/[<>\"'%;()&+]/g, '');
      }
    }
  }

  // Basic XSS protection for request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Remove script tags and dangerous characters
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

/**
 * IP whitelist middleware (for admin endpoints)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      return res.status(403).json({ 
        error: 'Access denied',
        code: 'IP_NOT_WHITELISTED'
      });
    }
    
    next();
  };
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'The request took too long to process'
        });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

/**
 * Anti-spam middleware for form submissions
 */
export const antiSpam = (minInterval: number = 1000) => {
  const submissions = new Map<string, number>();

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    const lastSubmission = submissions.get(identifier);

    if (lastSubmission && (now - lastSubmission) < minInterval) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please wait before submitting again',
        retryAfter: Math.ceil((minInterval - (now - lastSubmission)) / 1000)
      });
    }

    submissions.set(identifier, now);
    
    // Cleanup old entries
    if (submissions.size > 1000) {
      const cutoff = now - (minInterval * 2);
      const toDelete: string[] = [];
      submissions.forEach((timestamp, key) => {
        if (timestamp < cutoff) {
          toDelete.push(key);
        }
      });
      toDelete.forEach(key => submissions.delete(key));
    }

    next();
  };
};