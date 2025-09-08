import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Calendar metrics interface
interface CalendarMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorsByType: Record<string, number>;
  operationsByType: Record<string, number>;
  tokenRefreshCount: number;
  tokenExpiryWarnings: number;
  lastUpdated: string;
}

// In-memory metrics store (could be Redis in production)
class CalendarMetricsStore {
  private metrics: Map<string, CalendarMetrics> = new Map();
  private dailyStats: Map<string, number> = new Map();
  private monthlyStats: Map<string, number> = new Map();

  // Get or create metrics for a user
  getMetrics(userId: string): CalendarMetrics {
    if (!this.metrics.has(userId)) {
      this.metrics.set(userId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errorsByType: {},
        operationsByType: {},
        tokenRefreshCount: 0,
        tokenExpiryWarnings: 0,
        lastUpdated: new Date().toISOString()
      });
    }
    return this.metrics.get(userId)!;
  }

  // Update metrics
  updateMetrics(userId: string, updates: Partial<CalendarMetrics>) {
    const current = this.getMetrics(userId);
    Object.assign(current, updates, { lastUpdated: new Date().toISOString() });
    this.metrics.set(userId, current);
  }

  // Track daily usage
  trackDailyUsage(userId: string, operation: string) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}:${today}:${operation}`;
    this.dailyStats.set(key, (this.dailyStats.get(key) || 0) + 1);
    
    // Cleanup old entries (keep last 30 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    
    for (const [k] of this.dailyStats) {
      const [, date] = k.split(':');
      if (date < cutoffStr) {
        this.dailyStats.delete(k);
      }
    }
  }

  // Track monthly usage
  trackMonthlyUsage(userId: string, operation: string) {
    const month = new Date().toISOString().substring(0, 7); // YYYY-MM
    const key = `${userId}:${month}:${operation}`;
    this.monthlyStats.set(key, (this.monthlyStats.get(key) || 0) + 1);
  }

  // Get usage analytics
  getUsageAnalytics(userId: string, days: number = 7): {
    daily: Record<string, number>;
    monthly: Record<string, number>;
    operations: Record<string, number>;
  } {
    const daily: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    const operations: Record<string, number> = {};

    // Get daily stats
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      let dayTotal = 0;
      for (const [key, count] of this.dailyStats) {
        const [uid, d, operation] = key.split(':');
        if (uid === userId && d === dateStr) {
          dayTotal += count;
          operations[operation] = (operations[operation] || 0) + count;
        }
      }
      daily[dateStr] = dayTotal;
    }

    // Get monthly stats
    const currentMonth = new Date().toISOString().substring(0, 7);
    for (const [key, count] of this.monthlyStats) {
      const [uid, month] = key.split(':');
      if (uid === userId && month === currentMonth) {
        monthly[month] = count;
      }
    }

    return { daily, monthly, operations };
  }

  // Get all metrics for monitoring dashboard
  getAllMetrics(): Record<string, CalendarMetrics> {
    return Object.fromEntries(this.metrics);
  }
}

const metricsStore = new CalendarMetricsStore();

/**
 * Calendar monitoring middleware
 */
export const calendarMonitoring = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const userId = (req as any).user?.id || 'anonymous';
    const agentId = req.body?.agentId || req.query?.agentId || req.params?.agentId;

    // Track the operation
    metricsStore.trackDailyUsage(userId, operation);
    metricsStore.trackMonthlyUsage(userId, operation);

    // Update operation counts
    const metrics = metricsStore.getMetrics(userId);
    metrics.operationsByType[operation] = (metrics.operationsByType[operation] || 0) + 1;
    metrics.totalRequests++;

    // Override response to capture status and timing
    const originalSend = res.send.bind(res);
    res.send = function(body) {
      const duration = Date.now() - startTime;
      
      // Update response time average
      if (metrics.totalRequests > 0) {
        metrics.averageResponseTime = Math.round(
          (metrics.averageResponseTime * (metrics.totalRequests - 1) + duration) / metrics.totalRequests
        );
      } else {
        metrics.averageResponseTime = duration;
      }

      if (res.statusCode >= 200 && res.statusCode < 400) {
        metrics.successfulRequests++;
      } else {
        metrics.failedRequests++;
        
        // Track error types
        const errorType = `${res.statusCode}`;
        metrics.errorsByType[errorType] = (metrics.errorsByType[errorType] || 0) + 1;

        // Log calendar operation error to database
        if (agentId) {
          storage.logCalendarOperation({
            userId,
            agentId,
            operationType: operation,
            success: false,
            errorMessage: typeof body === 'string' ? body : JSON.stringify(body),
            inputData: req.body
          }).catch(console.error);
        }
      }

      metricsStore.updateMetrics(userId, metrics);
      return originalSend(body);
    };

    next();
  };
};

/**
 * Token expiry warning system
 */
export const checkTokenExpiry = async (userId: string, agentId: string): Promise<{
  needsRefresh: boolean;
  expiresIn: number;
  warning: boolean;
}> => {
  try {
    const connection = await storage.getGoogleCalendarConnection(userId, agentId);
    
    if (!connection || !connection.expiresAt) {
      return { needsRefresh: true, expiresIn: 0, warning: true };
    }

    const now = Date.now();
    const expiresAt = new Date(connection.expiresAt).getTime();
    const expiresIn = Math.max(0, expiresAt - now);
    const hoursUntilExpiry = expiresIn / (1000 * 60 * 60);

    // Warning if expires within 2 hours
    const warning = hoursUntilExpiry < 2;
    // Needs refresh if expires within 30 minutes
    const needsRefresh = hoursUntilExpiry < 0.5;

    if (warning) {
      const metrics = metricsStore.getMetrics(userId);
      metrics.tokenExpiryWarnings++;
      metricsStore.updateMetrics(userId, metrics);
    }

    return { needsRefresh, expiresIn, warning };
  } catch (error) {
    console.error('Token expiry check failed:', error);
    return { needsRefresh: true, expiresIn: 0, warning: true };
  }
};

/**
 * Error alerting system
 */
export const calendarErrorAlert = {
  // Error threshold settings
  ERROR_RATE_THRESHOLD: 0.3, // 30% error rate
  CONSECUTIVE_ERRORS_THRESHOLD: 5,
  
  // Check if we should send alerts
  shouldAlert(userId: string): {
    shouldAlert: boolean;
    reason?: string;
    metrics?: CalendarMetrics;
  } {
    const metrics = metricsStore.getMetrics(userId);
    
    if (metrics.totalRequests === 0) {
      return { shouldAlert: false };
    }

    const errorRate = metrics.failedRequests / metrics.totalRequests;
    
    // High error rate alert
    if (errorRate >= this.ERROR_RATE_THRESHOLD && metrics.totalRequests >= 10) {
      return {
        shouldAlert: true,
        reason: `High error rate: ${Math.round(errorRate * 100)}%`,
        metrics
      };
    }

    // Token refresh failures
    if (metrics.errorsByType['401'] >= 3) {
      return {
        shouldAlert: true,
        reason: `Multiple authentication failures: ${metrics.errorsByType['401']} attempts`,
        metrics
      };
    }

    // Rate limit hits
    if (metrics.errorsByType['429'] >= 5) {
      return {
        shouldAlert: true,
        reason: `Rate limit exceeded: ${metrics.errorsByType['429']} times`,
        metrics
      };
    }

    return { shouldAlert: false };
  },

  // Send alert (could integrate with email, Slack, etc.)
  async sendAlert(userId: string, reason: string, metrics: CalendarMetrics) {
    console.warn(`🚨 CALENDAR ALERT for user ${userId}: ${reason}`, {
      totalRequests: metrics.totalRequests,
      successRate: Math.round((metrics.successfulRequests / metrics.totalRequests) * 100),
      averageResponseTime: metrics.averageResponseTime,
      errors: metrics.errorsByType,
      timestamp: new Date().toISOString()
    });

    // Log alert to database
    try {
      await storage.logCalendarOperation({
        userId,
        agentId: 'system',
        operationType: 'alert',
        success: false,
        errorMessage: reason,
        inputData: { metrics }
      });
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }
};

/**
 * Get calendar analytics endpoint data
 */
export const getCalendarAnalytics = (userId: string, days: number = 7) => {
  const metrics = metricsStore.getMetrics(userId);
  const usage = metricsStore.getUsageAnalytics(userId, days);
  
  return {
    metrics: {
      totalRequests: metrics.totalRequests,
      successRate: metrics.totalRequests > 0 ? 
        Math.round((metrics.successfulRequests / metrics.totalRequests) * 100) : 0,
      averageResponseTime: metrics.averageResponseTime,
      errorRate: metrics.totalRequests > 0 ? 
        Math.round((metrics.failedRequests / metrics.totalRequests) * 100) : 0,
      tokenRefreshCount: metrics.tokenRefreshCount,
      tokenExpiryWarnings: metrics.tokenExpiryWarnings
    },
    usage,
    errors: metrics.errorsByType,
    operations: metrics.operationsByType,
    lastUpdated: metrics.lastUpdated
  };
};

/**
 * Request validation for calendar operations
 */
export const validateCalendarRequest = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    
    // Check required fields
    for (const field of requiredFields) {
      const value = req.body[field] || req.query[field] || req.params[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${field} is required`);
      }
    }

    // Validate agentId format (UUID)
    if (req.body.agentId || req.query.agentId) {
      const agentId = req.body.agentId || req.query.agentId;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(agentId)) {
        errors.push('Invalid agentId format');
      }
    }

    // Validate datetime fields
    const dateFields = ['startTime', 'endTime', 'timeMin', 'timeMax'];
    for (const field of dateFields) {
      const value = req.body[field] || req.query[field];
      if (value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`Invalid ${field} format - must be ISO 8601 datetime`);
        }
      }
    }

    // Validate email addresses in attendees
    if (req.body.attendees && Array.isArray(req.body.attendees)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of req.body.attendees) {
        if (typeof email === 'string' && !emailRegex.test(email)) {
          errors.push(`Invalid email format: ${email}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

// Export the metrics store for use in other modules
export { metricsStore, CalendarMetrics };