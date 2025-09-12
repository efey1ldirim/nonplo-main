import { EventEmitter } from 'events';

/**
 * Memory Management and Leak Prevention Module
 * Monitors memory usage, prevents leaks, and optimizes garbage collection
 */

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  heapUsedMB: number;
  heapTotalMB: number;
  memoryUsagePercent: number;
  timestamp: number;
}

interface MemoryThresholds {
  warning: number;    // 70% of heap
  critical: number;   // 85% of heap
  emergency: number;  // 95% of heap
}

interface MemoryManagerConfig {
  monitoringInterval: number;  // milliseconds
  gcInterval: number;         // milliseconds  
  maxEventListeners: number;
  cacheCleanupInterval: number;
  thresholds: MemoryThresholds;
}

class MemoryManager extends EventEmitter {
  private config: MemoryManagerConfig;
  private monitoringTimer?: NodeJS.Timeout;
  private gcTimer?: NodeJS.Timeout;
  private cacheCleanupTimer?: NodeJS.Timeout;
  private memoryHistory: MemoryMetrics[] = [];
  private isMonitoring = false;
  private weakRefs: Set<WeakRef<any>> = new Set();
  private intervals: Set<NodeJS.Timeout> = new Set();
  private timeouts: Set<NodeJS.Timeout> = new Set();

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    super();
    
    // Set max listeners to prevent memory leaks from event listeners
    this.setMaxListeners(20);
    
    this.config = {
      monitoringInterval: 30000,      // Monitor every 30 seconds
      gcInterval: 120000,             // Force GC every 2 minutes
      maxEventListeners: 15,          // Limit event listeners
      cacheCleanupInterval: 300000,   // Clean cache every 5 minutes
      thresholds: {
        warning: 0.70,    // 70%
        critical: 0.85,   // 85%
        emergency: 0.95   // 95%
      },
      ...config
    };

    this.setupMemoryOptimizations();
    this.startMonitoring();
  }

  private setupMemoryOptimizations(): void {
    // Optimize V8 heap settings for production
    if (process.env.NODE_ENV === 'production') {
      // Increase old space size if not set
      if (!process.execArgv.includes('--max-old-space-size')) {
        console.log('💡 Consider setting --max-old-space-size=2048 for production');
      }
      
      // Enable optimization flags
      if (!process.execArgv.includes('--optimize-for-size')) {
        console.log('💡 Consider using --optimize-for-size flag for better memory usage');
      }
    }

    // Handle uncaught exceptions to prevent memory leaks
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception - Potential Memory Leak:', error);
      this.emergencyCleanup();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection - Potential Memory Leak:', reason);
      this.emergencyCleanup();
    });

    // Monitor process warnings
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning') {
        console.warn('⚠️ Max listeners exceeded - potential memory leak');
        this.emit('memoryLeak', { type: 'eventListeners', warning });
      }
    });
  }

  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Memory monitoring
    this.monitoringTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.monitoringInterval);
    
    // Periodic garbage collection
    this.gcTimer = setInterval(() => {
      this.forceGarbageCollection();
    }, this.config.gcInterval);
    
    // Cache cleanup
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupCaches();
    }, this.config.cacheCleanupInterval);

    console.log('🔍 Memory monitoring started');
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
    
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = undefined;
    }
    
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = undefined;
    }

    console.log('🔍 Memory monitoring stopped');
  }

  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const metrics: MemoryMetrics = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      memoryUsagePercent: memUsage.heapUsed / memUsage.heapTotal,
      timestamp: Date.now()
    };

    // Keep only last 20 measurements
    this.memoryHistory.push(metrics);
    if (this.memoryHistory.length > 20) {
      this.memoryHistory.shift();
    }

    // Check thresholds
    this.checkThresholds(metrics);
    
    // Emit memory metrics
    this.emit('memoryMetrics', metrics);
  }

  private checkThresholds(metrics: MemoryMetrics): void {
    const usage = metrics.memoryUsagePercent;
    
    if (usage >= this.config.thresholds.emergency) {
      console.error(`🚨 EMERGENCY: Memory usage at ${Math.round(usage * 100)}%`);
      this.emergencyCleanup();
      this.emit('memoryEmergency', metrics);
    } else if (usage >= this.config.thresholds.critical) {
      console.warn(`⚠️ CRITICAL: Memory usage at ${Math.round(usage * 100)}%`);
      this.forceGarbageCollection();
      this.cleanupCaches();
      this.emit('memoryCritical', metrics);
    } else if (usage >= this.config.thresholds.warning) {
      console.warn(`⚠️ WARNING: Memory usage at ${Math.round(usage * 100)}%`);
      this.emit('memoryWarning', metrics);
    }
  }

  public forceGarbageCollection(): void {
    if (global.gc) {
      const beforeGC = process.memoryUsage().heapUsed;
      global.gc();
      const afterGC = process.memoryUsage().heapUsed;
      const freed = Math.round((beforeGC - afterGC) / 1024 / 1024);
      
      if (freed > 0) {
        console.log(`🗑️ Garbage collection freed ${freed}MB`);
      }
    } else {
      console.warn('⚠️ Garbage collection not available (run with --expose-gc)');
    }
  }

  private cleanupCaches(): void {
    // Clean expired cache entries
    this.emit('cleanupCaches');
    
    // Clean up weak references
    this.cleanupWeakRefs();
    
    console.log('🧹 Cache cleanup completed');
  }

  private cleanupWeakRefs(): void {
    let cleaned = 0;
    this.weakRefs.forEach(weakRef => {
      if (weakRef.deref() === undefined) {
        this.weakRefs.delete(weakRef);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`🗑️ Cleaned ${cleaned} weak references`);
    }
  }

  private emergencyCleanup(): void {
    console.log('🚨 Starting emergency memory cleanup...');
    
    // Force garbage collection
    this.forceGarbageCollection();
    
    // Clean all caches
    this.cleanupCaches();
    
    // Clear timers
    this.clearTimers();
    
    // Clean weak references
    this.cleanupWeakRefs();
    
    // Emit emergency cleanup event
    this.emit('emergencyCleanup');
    
    console.log('🚨 Emergency cleanup completed');
  }

  public registerWeakRef<T extends object>(obj: T): WeakRef<T> {
    const weakRef = new WeakRef(obj);
    this.weakRefs.add(weakRef);
    return weakRef;
  }

  public registerInterval(interval: NodeJS.Timeout): void {
    this.intervals.add(interval);
  }

  public registerTimeout(timeout: NodeJS.Timeout): void {
    this.timeouts.add(timeout);
  }

  public clearTimers(): void {
    this.intervals.forEach(interval => {
      clearInterval(interval);
    });
    this.intervals.clear();
    
    this.timeouts.forEach(timeout => {
      clearTimeout(timeout);
    });
    this.timeouts.clear();
    
    console.log('🕐 All registered timers cleared');
  }

  public getMemoryMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      memoryUsagePercent: memUsage.heapUsed / memUsage.heapTotal,
      timestamp: Date.now()
    };
  }

  public getMemoryHistory(): MemoryMetrics[] {
    return [...this.memoryHistory];
  }

  public getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryHistory.length < 5) return 'stable';
    
    const recent = this.memoryHistory.slice(-5);
    const trend = recent.reduce((acc, curr, idx) => {
      if (idx === 0) return acc;
      const prev = recent[idx - 1];
      if (curr.memoryUsagePercent > prev.memoryUsagePercent) {
        return acc + 1;
      } else if (curr.memoryUsagePercent < prev.memoryUsagePercent) {
        return acc - 1;
      }
      return acc;
    }, 0);
    
    if (trend > 2) return 'increasing';
    if (trend < -2) return 'decreasing';
    return 'stable';
  }

  public createMemoryEfficientHandler<T extends any[]>(
    handler: (...args: T) => void,
    maxCalls: number = 1000
  ): (...args: T) => void {
    let callCount = 0;
    
    return (...args: T) => {
      callCount++;
      
      if (callCount > maxCalls) {
        console.warn(`⚠️ Handler exceeded max calls (${maxCalls}), potential memory leak`);
        return;
      }
      
      try {
        handler(...args);
      } catch (error) {
        console.error('Memory efficient handler error:', error);
      }
    };
  }

  public createAutoClearingCache<K, V>(maxSize: number = 1000, ttl: number = 300000): Map<K, { value: V; expires: number }> {
    const cache = new Map<K, { value: V; expires: number }>();
    
    // Auto-cleanup interval
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      cache.forEach((item, key) => {
        if (item.expires < now) {
          cache.delete(key);
          cleaned++;
        }
      });
      
      // Size-based cleanup
      if (cache.size > maxSize) {
        const excess = cache.size - maxSize;
        const keys = Array.from(cache.keys()).slice(0, excess);
        keys.forEach(key => cache.delete(key));
        cleaned += excess;
      }
      
      if (cleaned > 0) {
        console.log(`🗑️ Auto-clearing cache cleaned ${cleaned} entries`);
      }
    }, 60000); // Check every minute
    
    this.registerInterval(cleanupInterval);
    
    return cache;
  }

  public destroy(): void {
    this.stopMonitoring();
    this.clearTimers();
    this.removeAllListeners();
    this.weakRefs.clear();
    this.memoryHistory = [];
    
    console.log('💥 Memory manager destroyed');
  }
}

// Singleton instance
export const memoryManager = new MemoryManager({
  monitoringInterval: 60000,    // Check every minute in production
  gcInterval: 300000,           // Force GC every 5 minutes
  cacheCleanupInterval: 600000, // Clean cache every 10 minutes
  thresholds: {
    warning: 0.75,     // 75%
    critical: 0.85,    // 85%
    emergency: 0.95    // 95%
  }
});

// Memory-efficient utilities
export const MemoryUtils = {
  createWeakMap: <K extends object, V>(): WeakMap<K, V> => new WeakMap(),
  
  createWeakSet: <T extends object>(): WeakSet<T> => new WeakSet(),
  
  createBoundedArray: <T>(maxSize: number): T[] & { push: (item: T) => void } => {
    const arr = [] as T[] & { push: (item: T) => void };
    const originalPush = arr.push;
    
    arr.push = function(item: T) {
      if (this.length >= maxSize) {
        this.shift();
      }
      return originalPush.call(this, item);
    };
    
    return arr;
  },
  
  nullify: (obj: any): void => {
    Object.keys(obj).forEach(key => {
      obj[key] = null;
    });
  },
  
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },
  
  createDisposable: <T extends { destroy?: () => void }>(resource: T): T & { dispose: () => void } => {
    return {
      ...resource,
      dispose() {
        if (resource.destroy) {
          resource.destroy();
        }
        MemoryUtils.nullify(resource);
      }
    };
  }
};

// Export types
export type { MemoryMetrics, MemoryThresholds, MemoryManagerConfig };