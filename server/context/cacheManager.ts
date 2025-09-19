/**
 * Cache Manager for Context Manager Settings and Stats
 * 
 * Provides efficient caching with TTL, memory management, and cache warming.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number;
  memoryUsage: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly MAX_SIZE = 1000;
  private readonly DEFAULT_TTL = 300000; // 5 minutes
  private stats = { hits: 0, misses: 0 };

  constructor() {
    // Periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccess: now,
    });

    console.log(`📦 Cache SET: ${key} (TTL: ${ttl}ms)`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.stats.misses++;
      console.log(`🔍 Cache MISS: ${key}`);
      return null;
    }

    // Check TTL
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`⏰ Cache EXPIRED: ${key}`);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = now;
    this.stats.hits++;

    console.log(`✅ Cache HIT: ${key} (access count: ${entry.accessCount})`);
    return entry.data;
  }

  invalidate(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      console.log(`🗑️  Cache INVALIDATE: ${count} entries matching "${pattern}"`);
    }

    return count;
  }

  invalidateUser(userId: string): number {
    return this.invalidate(`user:${userId}:`);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    console.log(`🧹 Cache CLEAR: removed ${size} entries`);
  }

  getStats(): CacheStats {
    const now = Date.now();
    let oldestEntry = now;
    let memoryUsage = 0;

    for (const key of this.cache.keys()) {
      const entry = this.cache.get(key)!;
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      memoryUsage += this.estimateSize(key, entry);
    }

    const total = this.stats.hits + this.stats.misses;
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? Math.round((this.stats.hits / total) * 10000) / 100 : 0,
      oldestEntry: now - oldestEntry,
      memoryUsage: Math.round(memoryUsage / 1024), // KB
    };
  }

  // Warm cache with commonly accessed data  
  async warmCache(): Promise<void> {
    console.log('🔥 Cache warming started...');
    
    // Only warm entries where we can safely provide defaults
    const healthKey = CacheManager.keys.systemHealth();
    if (!this.has(healthKey)) {
      this.set(healthKey, {
        status: 'healthy',
        metrics: { avgResponseTime: 0, successRate: 100, activeOperations: 0, circuitBreakerStatus: 'CLOSED' },
        recommendations: []
      }, 60000); // 1 minute default health
    }

    console.log('✅ Cache warming completed');
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const key of this.cache.keys()) {
      const entry = this.cache.get(key)!;
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`🧹 Cache cleanup: removed ${expiredCount} expired entries`);
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const key of this.cache.keys()) {
      const entry = this.cache.get(key)!;
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️  Cache LRU eviction: ${oldestKey}`);
    }
  }

  private estimateSize(key: string, entry: CacheEntry<any>): number {
    // Rough estimation of memory usage
    const keySize = key.length * 2; // Unicode characters
    const dataSize = JSON.stringify(entry.data).length * 2;
    const metadataSize = 64; // Rough estimate for timestamps, counters
    
    return keySize + dataSize + metadataSize;
  }

  // Cache key generators for consistency
  static keys = {
    userSettings: (userId: string) => `user:${userId}:settings`,
    userStats: (userId: string) => `user:${userId}:stats`,
    systemStats: () => 'stats:system',
    systemSettings: () => 'settings:system',
    systemHealth: () => 'health:status',
    threadTokens: (threadId: string) => `thread:${threadId}:tokens`,
  };
}

// Global cache manager instance
export const cacheManager = new CacheManager();

// Initialize cache warming on startup
cacheManager.warmCache().catch(error => {
  console.error('❌ Cache warming failed:', error);
});