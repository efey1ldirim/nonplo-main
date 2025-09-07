import { EventEmitter } from 'events';

interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    queryCount: number;
    slowQueries: number;
    averageQueryTime: number;
  };
  api: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    activeUsers: number;
  };
}

interface UserActivityMetrics {
  userId: string;
  actions: {
    agentsCreated: number;
    conversationsStarted: number;
    messagesExchanged: number;
    filesUploaded: number;
    lastActivity: string;
  };
}

class MetricsCollector extends EventEmitter {
  private metrics: SystemMetrics[] = [];
  private userActivities: Map<string, UserActivityMetrics> = new Map();
  private apiMetrics = {
    requests: 0,
    errors: 0,
    totalResponseTime: 0,
    activeUsers: new Set<string>()
  };

  constructor() {
    super();
    this.startCollection();
  }

  private startCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Clean old metrics every hour
    setInterval(() => {
      this.cleanOldMetrics();
    }, 3600000);
  }

  private async collectSystemMetrics(): Promise<void> {
    const now = new Date().toISOString();
    
    // Get system info (simplified for this environment)
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics: SystemMetrics = {
      timestamp: now,
      cpu: {
        usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to milliseconds
        loadAverage: [0.5, 0.3, 0.2] // Simulated load average
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      database: {
        connections: 1, // Current connection count
        queryCount: this.getDatabaseQueryCount(),
        slowQueries: this.getSlowQueryCount(),
        averageQueryTime: this.getAverageQueryTime()
      },
      api: {
        requestCount: this.apiMetrics.requests,
        errorCount: this.apiMetrics.errors,
        averageResponseTime: this.apiMetrics.requests > 0 
          ? Math.round(this.apiMetrics.totalResponseTime / this.apiMetrics.requests) 
          : 0,
        activeUsers: this.apiMetrics.activeUsers.size
      }
    };

    this.metrics.push(metrics);
    this.emit('metricsCollected', metrics);

    // Log important metrics
    if (metrics.memory.percentage > 80) {
      this.emit('alert', {
        type: 'memory',
        severity: 'warning',
        message: `High memory usage: ${metrics.memory.percentage}%`
      });
    }

    if (metrics.database.averageQueryTime > 500) {
      this.emit('alert', {
        type: 'database',
        severity: 'warning',
        message: `Slow database queries: ${metrics.database.averageQueryTime}ms average`
      });
    }
  }

  recordApiRequest(userId?: string, responseTime?: number, error?: boolean): void {
    this.apiMetrics.requests++;
    
    if (error) {
      this.apiMetrics.errors++;
    }

    if (responseTime) {
      this.apiMetrics.totalResponseTime += responseTime;
    }

    if (userId) {
      this.apiMetrics.activeUsers.add(userId);
      
      // Clean active users every 5 minutes
      setTimeout(() => {
        this.apiMetrics.activeUsers.delete(userId);
      }, 5 * 60 * 1000);
    }
  }

  recordUserActivity(userId: string, activity: keyof UserActivityMetrics['actions']): void {
    const user = this.userActivities.get(userId) || {
      userId,
      actions: {
        agentsCreated: 0,
        conversationsStarted: 0,
        messagesExchanged: 0,
        filesUploaded: 0,
        lastActivity: new Date().toISOString()
      }
    };

    user.actions[activity]++;
    user.actions.lastActivity = new Date().toISOString();
    
    this.userActivities.set(userId, user);
  }

  getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(hours: number = 24): SystemMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
  }

  getUserActivitySummary(): UserActivityMetrics[] {
    return Array.from(this.userActivities.values());
  }

  getTopActiveUsers(limit: number = 10): UserActivityMetrics[] {
    return Array.from(this.userActivities.values())
      .sort((a, b) => {
        const scoreA = a.actions.agentsCreated * 10 + a.actions.conversationsStarted * 5 + a.actions.messagesExchanged;
        const scoreB = b.actions.agentsCreated * 10 + b.actions.conversationsStarted * 5 + b.actions.messagesExchanged;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    score: number;
  } {
    const latest = this.getLatestMetrics();
    if (!latest) {
      return { status: 'warning', issues: ['No metrics available'], score: 50 };
    }

    const issues: string[] = [];
    let score = 100;

    if (latest.memory.percentage > 90) {
      issues.push('Critical memory usage');
      score -= 30;
    } else if (latest.memory.percentage > 80) {
      issues.push('High memory usage');
      score -= 15;
    }

    if (latest.database.averageQueryTime > 1000) {
      issues.push('Very slow database queries');
      score -= 25;
    } else if (latest.database.averageQueryTime > 500) {
      issues.push('Slow database queries');
      score -= 10;
    }

    if (latest.api.errorCount / latest.api.requestCount > 0.05) {
      issues.push('High API error rate');
      score -= 20;
    }

    const status = score > 80 ? 'healthy' : score > 60 ? 'warning' : 'critical';
    return { status, issues, score };
  }

  private getDatabaseQueryCount(): number {
    // This would integrate with your query analyzer
    return Math.floor(Math.random() * 100) + 50; // Simulated
  }

  private getSlowQueryCount(): number {
    return Math.floor(Math.random() * 5); // Simulated
  }

  private getAverageQueryTime(): number {
    return Math.floor(Math.random() * 200) + 50; // Simulated
  }

  private cleanOldMetrics(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // Keep 7 days
    this.metrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
  }

  // Reset methods for testing
  resetMetrics(): void {
    this.metrics = [];
    this.userActivities.clear();
    this.apiMetrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      activeUsers: new Set<string>()
    };
  }
}

export const metricsCollector = new MetricsCollector();

// Middleware to automatically collect API metrics
export const metricsMiddleware = (req: any, res: any, next: any) => {
  try {
    const startTime = Date.now();

    res.on('finish', () => {
      try {
        const responseTime = Date.now() - startTime;
        const isError = res.statusCode >= 400;
        const userId = req.user?.id;

        metricsCollector.recordApiRequest(userId, responseTime, isError);
      } catch (error) {
        console.error('Error in metrics collection:', error);
      }
    });

    next();
  } catch (error) {
    console.error('Error in metricsMiddleware:', error);
    next();
  }
};