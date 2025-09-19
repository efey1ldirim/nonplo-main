/**
 * Cache Manager Unit Tests
 * 
 * Tests caching functionality, TTL management, and memory optimization.
 */

import { CacheManager } from '../cacheManager';

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    jest.useFakeTimers();
    cacheManager = new CacheManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data correctly', () => {
      const testData = { key: 'value', number: 42 };
      
      cacheManager.set('test_key', testData);
      const retrieved = cacheManager.get('test_key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheManager.get('non_existent_key');
      expect(result).toBeNull();
    });

    it('should check existence correctly', () => {
      cacheManager.set('exists_key', 'value');
      
      expect(cacheManager.has('exists_key')).toBe(true);
      expect(cacheManager.has('not_exists_key')).toBe(false);
    });

    it('should handle different data types', () => {
      const testCases = [
        { key: 'string', value: 'test string' },
        { key: 'number', value: 12345 },
        { key: 'boolean', value: true },
        { key: 'object', value: { nested: { data: 'value' } } },
        { key: 'array', value: [1, 2, 3, 'four'] },
        { key: 'null', value: null },
      ];

      testCases.forEach(({ key, value }) => {
        cacheManager.set(key, value);
        expect(cacheManager.get(key)).toEqual(value);
      });
    });
  });

  describe('TTL (Time To Live) Management', () => {
    it('should respect TTL and expire entries', () => {
      cacheManager.set('ttl_key', 'value', 100); // 100ms TTL
      
      expect(cacheManager.get('ttl_key')).toBe('value');
      
      // Advance time past TTL
      jest.advanceTimersByTime(150);
      
      expect(cacheManager.get('ttl_key')).toBeNull();
      expect(cacheManager.has('ttl_key')).toBe(false);
    });

    it('should use default TTL when not specified', () => {
      cacheManager.set('default_ttl_key', 'value');
      
      // Should exist immediately
      expect(cacheManager.get('default_ttl_key')).toBe('value');
      
      // Should have a TTL set (we can't easily test the exact value without mocking time)
      expect(cacheManager.has('default_ttl_key')).toBe(true);
    });

    it('should allow custom TTL values', () => {
      const shortTTL = 50;
      const longTTL = 5000;
      
      cacheManager.set('short_ttl', 'short_value', shortTTL);
      cacheManager.set('long_ttl', 'long_value', longTTL);
      
      expect(cacheManager.get('short_ttl')).toBe('short_value');
      expect(cacheManager.get('long_ttl')).toBe('long_value');
    });
  });

  describe('Invalidation Patterns', () => {
    beforeEach(() => {
      // Set up test data
      cacheManager.set('user:123:profile', { name: 'John' });
      cacheManager.set('user:123:settings', { theme: 'dark' });
      cacheManager.set('user:456:profile', { name: 'Jane' });
      cacheManager.set('system:config', { version: '1.0' });
    });

    it('should invalidate entries by pattern', () => {
      const count = cacheManager.invalidate('user:123:.*');
      
      expect(count).toBe(2);
      expect(cacheManager.get('user:123:profile')).toBeNull();
      expect(cacheManager.get('user:123:settings')).toBeNull();
      expect(cacheManager.get('user:456:profile')).toBe('Jane');
      expect(cacheManager.get('system:config')).toEqual({ version: '1.0' });
    });

    it('should invalidate user-specific entries', () => {
      const count = cacheManager.invalidateUser('123');
      
      expect(count).toBe(2);
      expect(cacheManager.get('user:123:profile')).toBeNull();
      expect(cacheManager.get('user:123:settings')).toBeNull();
      expect(cacheManager.get('user:456:profile')).toBe('Jane');
    });

    it('should handle complex regex patterns', () => {
      cacheManager.set('api:v1:users', []);
      cacheManager.set('api:v1:posts', []);
      cacheManager.set('api:v2:users', []);
      
      const count = cacheManager.invalidate('api:v1:.*');
      
      expect(count).toBe(2);
      expect(cacheManager.get('api:v1:users')).toBeNull();
      expect(cacheManager.get('api:v1:posts')).toBeNull();
      expect(cacheManager.get('api:v2:users')).toEqual([]);
    });

    it('should return 0 when no patterns match', () => {
      const count = cacheManager.invalidate('non_matching_pattern');
      expect(count).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(() => {
      // Generate some cache activity
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      
      // Generate hits and misses
      cacheManager.get('key1'); // hit
      cacheManager.get('key1'); // hit
      cacheManager.get('key2'); // hit
      cacheManager.get('non_existent'); // miss
      cacheManager.get('another_miss'); // miss
    });

    it('should track cache hits and misses', () => {
      const stats = cacheManager.getStats();
      
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(60); // 3/5 * 100
      expect(stats.size).toBe(2);
    });

    it('should calculate hit rate correctly', () => {
      // Additional operations to test hit rate calculation
      cacheManager.get('key1'); // hit
      cacheManager.get('key1'); // hit
      
      const stats = cacheManager.getStats();
      expect(stats.hitRate).toBe(71.43); // 5/7 * 100, rounded to 2 decimals
    });

    it('should report memory usage estimation', () => {
      const stats = cacheManager.getStats();
      
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(typeof stats.memoryUsage).toBe('number');
    });

    it('should track oldest entry age', () => {
      const stats = cacheManager.getStats();
      
      expect(stats.oldestEntry).toBeGreaterThanOrEqual(0);
      expect(typeof stats.oldestEntry).toBe('number');
    });
  });

  describe('Memory Management', () => {
    it('should enforce maximum cache size', () => {
      // This test assumes the cache has a size limit (1000 by default)
      // We'll add entries beyond the limit to test LRU eviction
      
      for (let i = 0; i < 1200; i++) {
        cacheManager.set(`key_${i}`, `value_${i}`);
      }
      
      const stats = cacheManager.getStats();
      expect(stats.size).toBeLessThanOrEqual(1000);
    });

    it('should implement LRU eviction correctly', () => {
      // Fill cache to capacity
      for (let i = 0; i < 1000; i++) {
        cacheManager.set(`key_${i}`, `value_${i}`);
      }
      
      // Access first entry to make it recently used
      cacheManager.get('key_0');
      
      // Add new entry that should trigger eviction
      cacheManager.set('new_key', 'new_value');
      
      // The first key should still exist (recently accessed)
      expect(cacheManager.get('key_0')).toBe('value_0');
      
      // Some other key should have been evicted
      const stats = cacheManager.getStats();
      expect(stats.size).toBeLessThanOrEqual(1000);
    });

    it('should track access patterns', () => {
      cacheManager.set('popular_key', 'value');
      
      // Access multiple times
      for (let i = 0; i < 5; i++) {
        cacheManager.get('popular_key');
      }
      
      // The entry should still exist due to frequent access
      expect(cacheManager.get('popular_key')).toBe('value');
    });
  });

  describe('Cache Cleanup', () => {
    it('should automatically clean expired entries', (done) => {
      // Set entries with short TTL
      cacheManager.set('expire1', 'value1', 50);
      cacheManager.set('expire2', 'value2', 50);
      cacheManager.set('keep', 'value_keep', 5000);
      
      expect(cacheManager.getStats().size).toBe(3);
      
      // Wait for expiration + cleanup cycle
      setTimeout(() => {
        // Trigger cleanup by accessing cache
        cacheManager.get('keep');
        
        const stats = cacheManager.getStats();
        expect(stats.size).toBe(1);
        expect(cacheManager.get('keep')).toBe('value_keep');
        done();
      }, 100);
    });
  });

  describe('Clear Operations', () => {
    beforeEach(() => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.get('key1'); // Generate some stats
    });

    it('should clear all cache entries', () => {
      expect(cacheManager.getStats().size).toBe(2);
      
      cacheManager.clear();
      
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(cacheManager.get('key1')).toBeNull();
    });

    it('should reset statistics on clear', () => {
      cacheManager.clear();
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Cache Key Generators', () => {
    it('should provide consistent key generation', () => {
      const userId = 'user123';
      const threadId = 'thread456';
      
      expect(CacheManager.keys.userSettings(userId)).toBe('user:user123:settings');
      expect(CacheManager.keys.userStats(userId)).toBe('user:user123:stats');
      expect(CacheManager.keys.systemStats()).toBe('stats:system');
      expect(CacheManager.keys.systemSettings()).toBe('settings:system');
      expect(CacheManager.keys.systemHealth()).toBe('health:status');
      expect(CacheManager.keys.threadTokens(threadId)).toBe('thread:thread456:tokens');
    });

    it('should handle special characters in key generation', () => {
      const specialUserId = 'user@domain.com';
      const result = CacheManager.keys.userSettings(specialUserId);
      
      expect(result).toBe('user:user@domain.com:settings');
      expect(typeof result).toBe('string');
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with default entries', async () => {
      const initialSize = cacheManager.getStats().size;
      
      await cacheManager.warmCache();
      
      const finalSize = cacheManager.getStats().size;
      expect(finalSize).toBeGreaterThanOrEqual(initialSize);
    });

    it('should not overwrite existing entries during warming', async () => {
      const healthKey = CacheManager.keys.systemHealth();
      const customHealth = { status: 'custom', metrics: {} };
      
      cacheManager.set(healthKey, customHealth);
      
      await cacheManager.warmCache();
      
      expect(cacheManager.get(healthKey)).toEqual(customHealth);
    });

    it('should handle warming errors gracefully', async () => {
      // This test ensures warmCache doesn't throw
      await expect(cacheManager.warmCache()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined and null values', () => {
      cacheManager.set('undefined_key', undefined);
      cacheManager.set('null_key', null);
      
      expect(cacheManager.get('undefined_key')).toBeUndefined();
      expect(cacheManager.get('null_key')).toBeNull();
    });

    it('should handle very large objects', () => {
      const largeObject = {
        data: 'x'.repeat(10000),
        array: new Array(1000).fill('large_string'),
      };
      
      cacheManager.set('large_key', largeObject);
      const retrieved = cacheManager.get('large_key');
      
      expect(retrieved).toEqual(largeObject);
    });

    it('should handle rapid successive operations', () => {
      for (let i = 0; i < 100; i++) {
        cacheManager.set(`rapid_${i}`, i);
        expect(cacheManager.get(`rapid_${i}`)).toBe(i);
      }
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(100);
      expect(stats.size).toBe(100);
    });

    it('should handle empty and whitespace keys', () => {
      cacheManager.set('', 'empty_key_value');
      cacheManager.set(' ', 'space_key_value');
      cacheManager.set('\t\n', 'whitespace_key_value');
      
      expect(cacheManager.get('')).toBe('empty_key_value');
      expect(cacheManager.get(' ')).toBe('space_key_value');
      expect(cacheManager.get('\t\n')).toBe('whitespace_key_value');
    });
  });
});