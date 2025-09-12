interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class InMemoryCacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private hitCount = 0;
  private missCount = 0;

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });

    // Set cleanup timer
    setTimeout(() => {
      this.delete(key);
    }, ttl || this.defaultTTL);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return item.data;
  }

  getEntry<T>(key: string): CacheItem<T> | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return item;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): {
    size: number;
    hitRate: number;
    memoryUsage: string;
    hits: number;
    misses: number;
  } {
    const totalRequests = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? Math.round((this.hitCount / totalRequests) * 100) : 0,
      memoryUsage: `${Math.round(JSON.stringify([...this.cache.entries()]).length / 1024)} KB`,
      hits: this.hitCount,
      misses: this.missCount
    };
  }

  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Cache patterns for common queries
  generateCacheKey(prefix: string, ...params: any[]): string {
    return `${prefix}:${params.map(p => String(p)).join(':')}`;
  }

  // Optimized cache methods with better TTL values
  cacheUserAgents(userId: string, agents: any[], ttl: number = 5 * 60 * 1000): void { // Increased from 2min to 5min
    this.set(this.generateCacheKey('user_agents', userId), agents, ttl);
  }

  getCachedUserAgents(userId: string): any[] | null {
    return this.get(this.generateCacheKey('user_agents', userId));
  }

  cacheAgentDetails(agentId: string, agent: any, ttl: number = 10 * 60 * 1000): void { // Increased from 5min to 10min
    this.set(this.generateCacheKey('agent_details', agentId), agent, ttl);
  }

  getCachedAgentDetails(agentId: string): any | null {
    return this.get(this.generateCacheKey('agent_details', agentId));
  }

  // Dashboard stats cache (longer TTL since stats don't change frequently)
  cacheDashboardStats(userId: string, stats: any, ttl: number = 3 * 60 * 1000): void { // 3 minutes for stats
    this.set(this.generateCacheKey('dashboard_stats', userId), stats, ttl);
  }

  getCachedDashboardStats(userId: string): any | null {
    return this.get(this.generateCacheKey('dashboard_stats', userId));
  }

  cacheConversationMessages(conversationId: string, messages: any[], ttl: number = 60 * 1000): void { // Increased from 30s to 1min
    this.set(this.generateCacheKey('conversation_messages', conversationId), messages, ttl);
  }

  getCachedConversationMessages(conversationId: string): any[] | null {
    return this.get(this.generateCacheKey('conversation_messages', conversationId));
  }

  invalidateUserData(userId: string): void {
    // Find and delete all cache entries for this user
    const keysToDelete: string[] = [];
    for (const [key] of this.cache.entries()) {
      // Match the actual cache key format: route:/api/agents?userId=...:anonymous
      if (key.includes(`route:/api/agents`) && key.includes(`userId=${userId}`)) {
        keysToDelete.push(key);
      }
      // Also match other user-related cache entries
      if (key.includes(`user_agents:${userId}`) || 
          (key.includes(`agent_details:`) && key.includes(userId))) {
        keysToDelete.push(key);
      }
    };
    
    console.log(`🔍 Cache keys to delete for user ${userId}:`, keysToDelete);
    keysToDelete.forEach(key => {
      console.log(`🗑️ Deleting cache key: ${key}`);
      this.delete(key);
    });
  }

  invalidateAgentData(agentId: string): void {
    const keysToDelete: string[] = [];
    for (const [key] of this.cache.entries()) {
      if (key.includes(`agent_details:${agentId}`) ||
          key.includes(`conversation_messages:`) && key.includes(agentId) ||
          key.includes(`route:/api/agents/${agentId}`) ||
          key.includes(`route:/api/agents/${agentId}/conversations`)) {
        keysToDelete.push(key);
      }
    };
    
    console.log(`🗑️ Invalidating cache for agent ${agentId}: ${keysToDelete.length} keys`);
    keysToDelete.forEach(key => this.delete(key));
  }
  // Advanced cache strategies
  warmCache(prefix: string, dataLoader: () => Promise<any>, ttl?: number): void {
    dataLoader().then(data => {
      this.set(prefix, data, ttl);
      console.log(`🔥 Cache warmed for: ${prefix}`);
    }).catch(err => {
      console.error(`❌ Cache warming failed for ${prefix}:`, err);
    });
  }

  // Multi-level cache invalidation
  invalidateByPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const [key] of this.cache.entries()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    console.log(`🧹 Pattern invalidation for "${pattern}": ${keysToDelete.length} keys`);
    keysToDelete.forEach(key => this.delete(key));
  }

  // Cache analytics
  getDetailedStats(): {
    basic: any;
    topKeys: Array<{key: string, hits: number, size: string}>;
    expiringSoon: Array<{key: string, expiresIn: number}>;
  } {
    const basic = this.getStats();
    const now = Date.now();
    
    const topKeys: Array<{key: string, hits: number, size: string}> = [];
    const expiringSoon: Array<{key: string, expiresIn: number}> = [];
    
    for (const [key, item] of this.cache.entries()) {
      const size = JSON.stringify(item.data).length;
      topKeys.push({
        key: key.length > 50 ? key.substring(0, 47) + '...' : key,
        hits: 0, // We'd need to track this per key
        size: `${Math.round(size / 1024)} KB`
      });
      
      const expiresIn = Math.round((item.timestamp + item.ttl - now) / 1000);
      if (expiresIn < 60 && expiresIn > 0) { // Expiring in less than 1 minute
        expiringSoon.push({
          key: key.length > 50 ? key.substring(0, 47) + '...' : key,
          expiresIn
        });
      }
    }
    
    return {
      basic,
      topKeys: topKeys.slice(0, 10), // Top 10
      expiringSoon: expiringSoon.slice(0, 5) // Next 5 to expire
    };
  }
}

export const cacheManager = new InMemoryCacheManager();

// Cache middleware for Express
export const cacheMiddleware = (ttl: number = 5 * 60 * 1000) => {
  return (req: any, res: any, next: any) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `route:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
    const cachedEntry = cacheManager.getEntry(cacheKey);

    if (cachedEntry) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-TTL', Math.round((cachedEntry.timestamp + cachedEntry.ttl - Date.now()) / 1000).toString());
      return res.json(cachedEntry.data);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      if (res.statusCode === 200) {
        cacheManager.set(cacheKey, data, ttl);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-TTL', Math.round(ttl / 1000).toString());
      }
      return originalJson(data);
    };

    next();
  };
};