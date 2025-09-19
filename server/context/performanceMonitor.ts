/**
 * Performance Monitoring System
 * 
 * Tracks Context Manager performance metrics, response times, and system health.
 */

interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  tokenCount?: number;
  errorType?: string;
  userId?: string;
}

interface AggregatedMetrics {
  operation: string;
  count: number;
  avgDuration: number;
  successRate: number;
  p95Duration: number;
  totalTokens: number;
  lastError?: string;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 10000;
  private readonly CLEANUP_INTERVAL = 3600000; // 1 hour

  constructor() {
    // Periodic cleanup to prevent memory leaks
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  startTimer(operation: string, userId?: string): () => void {
    const startTime = Date.now();
    
    return (success: boolean = true, tokenCount?: number, errorType?: string) => {
      const duration = Date.now() - startTime;
      
      this.recordMetric({
        timestamp: startTime,
        operation,
        duration,
        success,
        tokenCount,
        errorType,
        userId,
      });
    };
  }

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Log significant events
    if (!metric.success) {
      console.warn(`⚠️  Performance: ${metric.operation} failed after ${metric.duration}ms - ${metric.errorType}`);
    } else if (metric.duration > 5000) {
      console.warn(`🐌 Performance: Slow ${metric.operation} took ${metric.duration}ms`);
    }

    // Prevent memory overflow
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS * 0.8);
    }
  }

  getMetrics(operation?: string, hours: number = 24): AggregatedMetrics[] {
    const cutoff = Date.now() - (hours * 3600000);
    const filtered = this.metrics.filter(m => 
      m.timestamp > cutoff && 
      (!operation || m.operation === operation)
    );

    const grouped = this.groupByOperation(filtered);
    return Object.entries(grouped).map(([op, metrics]) => 
      this.aggregateMetrics(op, metrics)
    );
  }

  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: {
      avgResponseTime: number;
      successRate: number;
      activeOperations: number;
      circuitBreakerStatus: string;
    };
    recommendations: string[];
  } {
    const recent = this.metrics.filter(m => 
      m.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    if (recent.length === 0) {
      return {
        status: 'healthy',
        metrics: {
          avgResponseTime: 0,
          successRate: 100,
          activeOperations: 0,
          circuitBreakerStatus: 'CLOSED',
        },
        recommendations: [],
      };
    }

    const avgResponseTime = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
    const successRate = (recent.filter(m => m.success).length / recent.length) * 100;
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (successRate < 90) {
      status = 'critical';
      recommendations.push('High failure rate detected - check OpenAI API status');
    } else if (successRate < 95) {
      status = 'degraded';
      recommendations.push('Elevated failure rate - monitor closely');
    }

    if (avgResponseTime > 10000) {
      status = status === 'healthy' ? 'degraded' : 'critical';
      recommendations.push('High response times - consider scaling or optimization');
    }

    return {
      status,
      metrics: {
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        activeOperations: recent.length,
        circuitBreakerStatus: 'CLOSED', // Will be enhanced with actual CB status
      },
      recommendations,
    };
  }

  private groupByOperation(metrics: PerformanceMetrics[]): Record<string, PerformanceMetrics[]> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = [];
      }
      acc[metric.operation].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetrics[]>);
  }

  private aggregateMetrics(operation: string, metrics: PerformanceMetrics[]): AggregatedMetrics {
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.success).length;
    const lastError = metrics.filter(m => !m.success).pop()?.errorType;

    return {
      operation,
      count: metrics.length,
      avgDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      successRate: Math.round((successCount / metrics.length) * 10000) / 100,
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
      totalTokens: metrics.reduce((sum, m) => sum + (m.tokenCount || 0), 0),
      lastError,
    };
  }

  private cleanup(): void {
    const cutoff = Date.now() - (24 * 3600000); // Keep last 24 hours
    const originalLength = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (originalLength !== this.metrics.length) {
      console.log(`🧹 Performance metrics cleanup: removed ${originalLength - this.metrics.length} old entries`);
    }
  }

  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      health: this.getSystemHealth(),
    }, null, 2);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();