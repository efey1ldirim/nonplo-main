/**
 * Context Manager API Integration Tests
 * 
 * Tests the REST API endpoints for Context Manager functionality.
 */

import request from 'supertest';
import express from 'express';
import { contextManagerRoutes } from '../routes/context-manager';

// Mock the Context Manager
jest.mock('../context/contextManager', () => ({
  contextManager: {
    getStats: jest.fn(),
    toggleEnabled: jest.fn(),
  },
}));

// Mock authentication middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  if (token === 'valid_token') {
    req.user = { id: 'user123', email: 'test@example.com' };
    next();
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Apply mock auth middleware to context manager routes
  app.use('/api/context-manager', mockAuthMiddleware);
  app.use('/api/context-manager', contextManagerRoutes);
  
  return app;
};

describe('Context Manager API', () => {
  let app: express.Application;
  let mockContextManager: any;

  beforeEach(() => {
    app = createTestApp();
    
    // Get the mocked context manager
    const { contextManager } = require('../context/contextManager');
    mockContextManager = contextManager;
    
    jest.clearAllMocks();
  });

  describe('GET /api/context-manager/stats', () => {
    it('should return stats for authenticated user', async () => {
      const mockStats = {
        enabled: true,
        liveBudget: 12000,
        hardCap: 120000,
        settings: {
          enabled: true,
          liveBudget: 12000,
          hardCap: 120000,
        },
        usage: {},
        tokenizer: { totalTokensCounted: 1000 },
        summarizer: { totalSummaries: 5 },
        optimizer: { totalOptimizations: 3 },
        performance: {
          operation: 'prepareThreadForRun',
          count: 10,
          avgDuration: 250,
          successRate: 95,
          p95Duration: 400,
          totalTokens: 5000,
        },
        system: {
          cache: { size: 5, hits: 15, misses: 3, hitRate: 83.33 },
          circuitBreaker: {
            openai: { state: 'CLOSED', failures: 0, isOpen: false },
            summarizer: { state: 'CLOSED', failures: 0, isOpen: false },
          },
          health: {
            status: 'healthy',
            metrics: { avgResponseTime: 200, successRate: 98, activeOperations: 2 },
            recommendations: [],
          },
        },
      };

      mockContextManager.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/context-manager/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body).toEqual(mockStats);
      expect(mockContextManager.getStats).toHaveBeenCalledTimes(1);
    });

    it('should return 401 for missing authorization', async () => {
      const response = await request(app)
        .get('/api/context-manager/stats')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Missing or invalid authorization header',
      });
      expect(mockContextManager.getStats).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/context-manager/stats')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Invalid token',
      });
      expect(mockContextManager.getStats).not.toHaveBeenCalled();
    });

    it('should return 500 for internal errors', async () => {
      mockContextManager.getStats.mockRejectedValue(new Error('Internal error'));

      const response = await request(app)
        .get('/api/context-manager/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to get Context Manager stats',
      });
    });
  });

  describe('POST /api/context-manager/toggle', () => {
    it('should toggle enabled state successfully', async () => {
      const mockUpdatedStats = {
        enabled: true,
        liveBudget: 12000,
        hardCap: 120000,
        settings: { enabled: true },
        usage: {},
        tokenizer: {},
        summarizer: {},
        optimizer: {},
        performance: {},
        system: {},
      };

      mockContextManager.toggleEnabled.mockResolvedValue(mockUpdatedStats);

      const response = await request(app)
        .post('/api/context-manager/toggle')
        .set('Authorization', 'Bearer valid_token')
        .send({ enabled: true })
        .expect(200);

      expect(response.body).toEqual(mockUpdatedStats);
      expect(mockContextManager.toggleEnabled).toHaveBeenCalledWith(true);
    });

    it('should validate required enabled field', async () => {
      const response = await request(app)
        .post('/api/context-manager/toggle')
        .set('Authorization', 'Bearer valid_token')
        .send({}) // Missing enabled field
        .expect(400);

      expect(response.body).toEqual({
        error: 'enabled field is required and must be a boolean',
      });
      expect(mockContextManager.toggleEnabled).not.toHaveBeenCalled();
    });

    it('should validate enabled field type', async () => {
      const response = await request(app)
        .post('/api/context-manager/toggle')
        .set('Authorization', 'Bearer valid_token')
        .send({ enabled: 'true' }) // String instead of boolean
        .expect(400);

      expect(response.body).toEqual({
        error: 'enabled field is required and must be a boolean',
      });
      expect(mockContextManager.toggleEnabled).not.toHaveBeenCalled();
    });

    it('should return 401 for missing authorization', async () => {
      const response = await request(app)
        .post('/api/context-manager/toggle')
        .send({ enabled: true })
        .expect(401);

      expect(response.body).toEqual({
        error: 'Missing or invalid authorization header',
      });
      expect(mockContextManager.toggleEnabled).not.toHaveBeenCalled();
    });

    it('should return 500 for internal errors', async () => {
      mockContextManager.toggleEnabled.mockRejectedValue(new Error('Toggle failed'));

      const response = await request(app)
        .post('/api/context-manager/toggle')
        .set('Authorization', 'Bearer valid_token')
        .send({ enabled: false })
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to toggle Context Manager',
      });
    });
  });

  describe('Health Check Scenarios', () => {
    it('should handle high load gracefully', async () => {
      const mockStats = {
        enabled: true,
        system: {
          health: {
            status: 'degraded',
            metrics: { avgResponseTime: 5000, successRate: 85 },
            recommendations: ['High response times detected'],
          },
        },
      };

      mockContextManager.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/context-manager/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.system.health.status).toBe('degraded');
      expect(response.body.system.health.recommendations).toContain('High response times detected');
    });

    it('should report circuit breaker status', async () => {
      const mockStats = {
        enabled: true,
        system: {
          circuitBreaker: {
            openai: { state: 'OPEN', failures: 5, isOpen: true },
            summarizer: { state: 'CLOSED', failures: 0, isOpen: false },
          },
        },
      };

      mockContextManager.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/context-manager/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.system.circuitBreaker.openai.state).toBe('OPEN');
      expect(response.body.system.circuitBreaker.openai.isOpen).toBe(true);
      expect(response.body.system.circuitBreaker.summarizer.state).toBe('CLOSED');
    });
  });

  describe('Performance Metrics', () => {
    it('should include performance metrics in stats', async () => {
      const mockStats = {
        enabled: true,
        performance: {
          operation: 'prepareThreadForRun',
          count: 100,
          avgDuration: 150,
          successRate: 98.5,
          p95Duration: 300,
          totalTokens: 50000,
        },
      };

      mockContextManager.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/context-manager/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      const perf = response.body.performance;
      expect(perf.operation).toBe('prepareThreadForRun');
      expect(perf.count).toBe(100);
      expect(perf.avgDuration).toBe(150);
      expect(perf.successRate).toBe(98.5);
      expect(perf.p95Duration).toBe(300);
      expect(perf.totalTokens).toBe(50000);
    });
  });

  describe('Cache Metrics', () => {
    it('should include cache statistics', async () => {
      const mockStats = {
        enabled: true,
        system: {
          cache: {
            size: 25,
            hits: 150,
            misses: 20,
            hitRate: 88.24,
            oldestEntry: 300000, // 5 minutes
            memoryUsage: 512, // KB
          },
        },
      };

      mockContextManager.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/context-manager/stats')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      const cache = response.body.system.cache;
      expect(cache.size).toBe(25);
      expect(cache.hits).toBe(150);
      expect(cache.misses).toBe(20);
      expect(cache.hitRate).toBe(88.24);
      expect(cache.memoryUsage).toBe(512);
    });
  });
});