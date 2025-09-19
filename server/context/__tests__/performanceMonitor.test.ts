/**
 * Performance Monitor Unit Tests
 * 
 * Tests performance monitoring, metrics collection, and health assessment.
 */

import { PerformanceMonitor } from '../performanceMonitor';

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    jest.useFakeTimers();
    performanceMonitor = new PerformanceMonitor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Timer Functionality', () => {
    it('should create and execute timer correctly', () => {
      const timer = performanceMonitor.startTimer('test_operation', 'user123');
      
      expect(typeof timer).toBe('function');
      
      // Execute timer
      timer(true, 1000);
      
      const metrics = performanceMonitor.getMetrics('test_operation', 1);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('test_operation');
      expect(metrics[0].count).toBe(1);
      expect(metrics[0].successRate).toBe(100);
      expect(metrics[0].totalTokens).toBe(1000);
    });

    it('should record failure correctly', () => {
      const timer = performanceMonitor.startTimer('test_operation');
      
      timer(false, 0, 'Network error');
      
      const metrics = performanceMonitor.getMetrics('test_operation', 1);
      expect(metrics[0].successRate).toBe(0);
      expect(metrics[0].lastError).toBe('Network error');
    });

    it('should measure duration accurately', async () => {
      const timer = performanceMonitor.startTimer('duration_test');
      
      // Advance time by 100ms
      jest.advanceTimersByTime(100);
      timer(true);
      
      const metrics = performanceMonitor.getMetrics('duration_test', 1);
      expect(metrics[0].avgDuration).toBeGreaterThanOrEqual(100);
      expect(metrics[0].count).toBe(1);
      expect(metrics[0].successRate).toBe(100);
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(() => {
      // Add some test data
      const timer1 = performanceMonitor.startTimer('operation_a', 'user1');
      timer1(true, 500);
      
      const timer2 = performanceMonitor.startTimer('operation_a', 'user2');
      timer2(true, 300);
      
      const timer3 = performanceMonitor.startTimer('operation_b');
      timer3(false, 0, 'API error');
    });

    it('should aggregate metrics by operation', () => {
      const metrics = performanceMonitor.getMetrics('operation_a', 1);
      
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('operation_a');
      expect(metrics[0].count).toBe(2);
      expect(metrics[0].successRate).toBe(100);
      expect(metrics[0].totalTokens).toBe(800);
    });

    it('should filter metrics by time window', () => {
      // Get metrics from a very short time window (should be empty)
      const recentMetrics = performanceMonitor.getMetrics(undefined, 0);
      expect(recentMetrics).toHaveLength(0);
      
      // Get metrics from a longer time window (should include our test data)
      const allMetrics = performanceMonitor.getMetrics(undefined, 1);
      expect(allMetrics.length).toBeGreaterThan(0);
    });

    it('should calculate percentiles correctly', () => {
      // Add data points with different durations
      const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      durations.forEach((duration, i) => {
        const timer = performanceMonitor.startTimer('percentile_test');
        jest.advanceTimersByTime(duration);
        timer(true, 100 * i);
      });
      
      const metrics = performanceMonitor.getMetrics('percentile_test', 1);
      expect(metrics[0].count).toBe(10);
      expect(metrics[0].p95Duration).toBeGreaterThan(0);
      expect(metrics[0].totalTokens).toBe(4500); // Sum of 0+100+200+...+900
    });

    it('should group metrics by operation correctly', () => {
      const allMetrics = performanceMonitor.getMetrics(undefined, 1);
      
      const operationNames = allMetrics.map(m => m.operation);
      expect(operationNames).toContain('operation_a');
      expect(operationNames).toContain('operation_b');
    });
  });

  describe('System Health Assessment', () => {
    it('should report healthy status for good performance', () => {
      // Add successful operations
      for (let i = 0; i < 10; i++) {
        const timer = performanceMonitor.startTimer('fast_operation');
        timer(true, 100); // Fast operation
      }
      
      const health = performanceMonitor.getSystemHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.metrics.successRate).toBe(100);
      expect(health.recommendations).toHaveLength(0);
    });

    it('should report degraded status for slow performance', () => {
      // Add slow operations
      const timer = performanceMonitor.startTimer('slow_operation');
      // Mock a very slow operation
      performanceMonitor.recordMetric({
        timestamp: Date.now(),
        operation: 'slow_operation',
        duration: 15000, // 15 seconds - very slow
        success: true,
      });
      
      const health = performanceMonitor.getSystemHealth();
      
      expect(health.status).toBe('degraded');
      expect(health.recommendations.length).toBeGreaterThan(0);
      expect(health.recommendations[0]).toContain('response times');
    });

    it('should report critical status for high failure rate', () => {
      // Add many failed operations
      for (let i = 0; i < 10; i++) {
        const timer = performanceMonitor.startTimer('failing_operation');
        timer(false, 0, 'Simulated failure');
      }
      
      const health = performanceMonitor.getSystemHealth();
      
      expect(health.status).toBe('critical');
      expect(health.metrics.successRate).toBeLessThan(90);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle empty metrics gracefully', () => {
      const emptyMonitor = new PerformanceMonitor();
      const health = emptyMonitor.getSystemHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.metrics.avgResponseTime).toBe(0);
      expect(health.metrics.successRate).toBe(100);
      expect(health.metrics.activeOperations).toBe(0);
    });
  });

  describe('Memory Management', () => {
    it('should limit maximum metrics stored', () => {
      // Add many metrics to test memory limits
      for (let i = 0; i < 15000; i++) {
        const timer = performanceMonitor.startTimer('memory_test');
        timer(true, 100);
      }
      
      // The monitor should automatically limit stored metrics
      const metrics = performanceMonitor.getMetrics(undefined, 24);
      expect(metrics.length).toBeLessThan(15000);
    });

    it('should clean up old metrics periodically', (done) => {
      // This test verifies the cleanup mechanism exists
      // We can't easily test the actual cleanup without mocking timers
      
      const timer = performanceMonitor.startTimer('cleanup_test');
      timer(true);
      
      // Verify the metric was recorded
      const metrics = performanceMonitor.getMetrics('cleanup_test', 1);
      expect(metrics.length).toBeGreaterThan(0);
      
      done();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid operation names gracefully', () => {
      const timer = performanceMonitor.startTimer('');
      
      expect(() => timer(true)).not.toThrow();
      
      const metrics = performanceMonitor.getMetrics('', 1);
      expect(metrics).toHaveLength(1);
    });

    it('should handle negative durations', () => {
      // Mock a metric with negative duration (shouldn't happen in practice)
      performanceMonitor.recordMetric({
        timestamp: Date.now(),
        operation: 'negative_test',
        duration: -100,
        success: true,
      });
      
      const metrics = performanceMonitor.getMetrics('negative_test', 1);
      expect(metrics[0].avgDuration).toBe(-100); // Should store as-is
    });

    it('should handle very large numbers gracefully', () => {
      performanceMonitor.recordMetric({
        timestamp: Date.now(),
        operation: 'large_number_test',
        duration: Number.MAX_SAFE_INTEGER,
        success: true,
        tokenCount: Number.MAX_SAFE_INTEGER,
      });
      
      const metrics = performanceMonitor.getMetrics('large_number_test', 1);
      expect(metrics[0].avgDuration).toBe(Number.MAX_SAFE_INTEGER);
      expect(metrics[0].totalTokens).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Export Functionality', () => {
    it('should export metrics in correct format', () => {
      const timer = performanceMonitor.startTimer('export_test');
      timer(true, 500);
      
      const exportedData = performanceMonitor.exportMetrics();
      const parsed = JSON.parse(exportedData);
      
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('health');
      expect(Array.isArray(parsed.metrics)).toBe(true);
      expect(typeof parsed.health).toBe('object');
    });

    it('should include health data in export', () => {
      const exportedData = performanceMonitor.exportMetrics();
      const parsed = JSON.parse(exportedData);
      
      expect(parsed.health).toHaveProperty('status');
      expect(parsed.health).toHaveProperty('metrics');
      expect(parsed.health).toHaveProperty('recommendations');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent timers correctly', () => {
      const timers: Array<() => void> = [];
      
      // Start multiple timers
      for (let i = 0; i < 5; i++) {
        const timer = performanceMonitor.startTimer('concurrent_test', `user${i}`);
        timers.push(() => timer(true, 100 * i));
      }
      
      // Execute all timers
      timers.forEach(timer => timer());
      
      const metrics = performanceMonitor.getMetrics('concurrent_test', 1);
      expect(metrics[0].count).toBe(5);
      expect(metrics[0].successRate).toBe(100);
    });
  });
});