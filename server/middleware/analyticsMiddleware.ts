import { Request, Response, NextFunction } from 'express';
import { analyticsManager } from '../analytics/AnalyticsManager';
import crypto from 'crypto';

// Extend Request interface to include analytics
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
      analyticsUserId?: string;
    }
  }
}

// Analytics tracking middleware
export const analyticsTrackingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate or retrieve session ID
  const sessionId = req.headers['x-session-id'] as string || 
                   req.cookies?.sessionId || 
                   crypto.randomBytes(16).toString('hex');

  req.sessionId = sessionId;

  // Set session cookie if not exists
  if (!req.cookies?.sessionId) {
    res.cookie('sessionId', sessionId, {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }

  // Extract user ID from auth token if available
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // Basic JWT decode to get user ID (simplified)
      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      req.analyticsUserId = payload.sub || payload.user_id;
    } catch (error) {
      // Silent fail for analytics
    }
  }

  // Create or update session
  if (!analyticsManager.sessions?.has(sessionId)) {
    analyticsManager.createSession(sessionId, {
      userId: req.analyticsUserId,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      referrer: req.headers.referer
    });
  }

  // Track page views for non-API routes
  if (!req.path.startsWith('/api') && req.method === 'GET') {
    analyticsManager.trackPageView(sessionId, req.path, req.analyticsUserId);
  }

  // Track API calls
  if (req.path.startsWith('/api') && req.method !== 'GET') {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      analyticsManager.trackEvent({
        event: 'api_call',
        userId: req.analyticsUserId,
        sessionId,
        timestamp: new Date(),
        properties: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode < 400
        }
      });
    });
  }

  next();
};

// Performance monitoring middleware
export const performanceTrackingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Track performance metrics for API endpoints
    if (req.path.startsWith('/api')) {
      analyticsManager.trackEvent({
        event: 'performance_metric',
        userId: req.analyticsUserId,
        sessionId: req.sessionId,
        timestamp: new Date(),
        properties: {
          path: req.path,
          method: req.method,
          duration,
          memoryDelta,
          statusCode: res.statusCode,
          responseSize: res.get('content-length') || 0
        }
      });

      // Log slow requests
      if (duration > 5000) { // 5 seconds
        console.warn(`🐌 Slow request: ${req.method} ${req.path} took ${duration}ms`);
        
        analyticsManager.trackEvent({
          event: 'slow_request',
          userId: req.analyticsUserId,
          sessionId: req.sessionId,
          timestamp: new Date(),
          properties: {
            path: req.path,
            method: req.method,
            duration,
            memoryDelta
          }
        });
      }
    }
  });

  next();
};

// Error tracking middleware
export const errorTrackingMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Track error event
  analyticsManager.trackEvent({
    event: 'error',
    userId: req.analyticsUserId,
    sessionId: req.sessionId,
    timestamp: new Date(),
    properties: {
      errorMessage: error.message,
      errorStack: error.stack,
      path: req.path,
      method: req.method,
      statusCode: error.status || 500,
      userAgent: req.headers['user-agent']
    }
  });

  console.error(`❌ Error tracked: ${error.message} on ${req.method} ${req.path}`);
  
  next(error);
};

// User action tracking middleware for specific events
export const trackUserAction = (action: string, properties: Record<string, any> = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    analyticsManager.trackEvent({
      event: action,
      userId: req.analyticsUserId,
      sessionId: req.sessionId,
      timestamp: new Date(),
      properties: {
        path: req.path,
        method: req.method,
        ...properties
      }
    });

    next();
  };
};

// Business metrics tracking
export const trackBusinessMetric = (metricType: string, value: number, properties: Record<string, any> = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    analyticsManager.trackEvent({
      event: `business_metric_${metricType}`,
      userId: req.analyticsUserId,
      sessionId: req.sessionId,
      timestamp: new Date(),
      properties: {
        metricType,
        value,
        ...properties
      }
    });

    next();
  };
};