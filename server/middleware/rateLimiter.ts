import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RequestRecord {
  count: number;
  resetTime: number;
  failures: number;
}

class InMemoryRateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  
  private cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];
    this.requests.forEach((record, key) => {
      if (now > record.resetTime) {
        toDelete.push(key);
      }
    });
    toDelete.forEach(key => this.requests.delete(key));
  }

  isAllowed(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    this.cleanup();
    
    const now = Date.now();
    const record = this.requests.get(key) || {
      count: 0,
      resetTime: now + config.windowMs,
      failures: 0
    };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + config.windowMs;
      record.failures = 0;
    }

    const allowed = record.count < config.maxRequests;
    
    if (allowed) {
      record.count++;
      this.requests.set(key, record);
    }

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - record.count),
      resetTime: record.resetTime
    };
  }

  recordFailure(key: string) {
    const record = this.requests.get(key);
    if (record) {
      record.failures++;
    }
  }
}

const globalLimiter = new InMemoryRateLimiter();

/**
 * Rate limiting middleware for Express
 */
export const createRateLimiter = (config: RateLimitConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate key based on IP and user ID
    const userId = (req as any).user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = userId ? `user:${userId}` : `ip:${ip}`;

    const result = globalLimiter.isAllowed(key, config);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      
      return res.status(429).json({
        error: config.message || 'Too many requests',
        retryAfter,
        resetTime: new Date(result.resetTime).toISOString()
      });
    }

    // Track failures for progressive penalties
    const originalSend = res.send.bind(res);
    res.send = function(body) {
      if (res.statusCode >= 400) {
        globalLimiter.recordFailure(key);
      }
      return originalSend(body);
    };

    next();
  };
};

// Predefined rate limiters
export const rateLimiters = {
  // General API requests
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many API requests, please try again later'
  }),

  // Agent creation (more restrictive)
  agentCreation: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many agent creation requests, please wait before creating more agents'
  }),

  // Chat/messaging (higher limit)
  chat: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many messages, please slow down'
  }),

  // File uploads (very restrictive)
  upload: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
    message: 'Too many file uploads, please try again later'
  }),

  // Authentication attempts
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later'
  }),

  // Calendar API operations (moderate restrictions)
  calendar: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50,
    message: 'Too many calendar requests, please try again later'
  }),

  // Calendar OAuth (very restrictive)
  calendarOAuth: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many OAuth attempts, please wait before trying again'
  }),

  // Calendar event operations (balanced)
  calendarEvents: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Too many calendar event operations, please slow down'
  })
};