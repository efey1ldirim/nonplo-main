/**
 * Context Manager Integration Tests
 * 
 * Tests core Context Manager functionality including thread management and optimization.
 */

import { ContextManager } from '../contextManager';
import { Store } from '../store';
import * as fs from 'fs';
import * as path from 'path';

// Mock external dependencies
jest.mock('openai');
jest.mock('../store');
jest.mock('../tokenizer');
jest.mock('../summarizer');
jest.mock('../usageOptimizer');
jest.mock('../privacy');
jest.mock('../circuitBreaker');
jest.mock('../performanceMonitor');
jest.mock('../cacheManager');

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const MockedStore = Store as jest.MockedClass<typeof Store>;

describe('ContextManager', () => {
  let contextManager: ContextManager;
  let mockStore: jest.Mocked<Store>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup store mock
    mockStore = {
      loadSettings: jest.fn(),
      toggleEnabled: jest.fn(),
      getStoreStats: jest.fn(),
      clearCache: jest.fn(),
    } as any;
    
    MockedStore.mockImplementation(() => mockStore);
    
    // Mock default settings
    mockStore.loadSettings.mockResolvedValue({
      enabled: true,
      liveBudget: 12000,
      hardCap: 120000,
      autoOptimize: true,
      enablePiiStripping: true,
      debugMode: false,
      usage: {
        totalTokensUsed: 0,
        totalCost: 0,
        requestCount: 0,
        lastReset: new Date(),
      },
    });
    
    mockStore.getStoreStats.mockResolvedValue({
      fileSize: 1024,
      lastModified: new Date(),
      backupCount: 0,
    });

    contextManager = new ContextManager();
  });

  describe('Initialization', () => {
    it('should initialize Context Manager with default settings', async () => {
      // Allow time for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockStore.loadSettings).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockStore.loadSettings.mockRejectedValue(new Error('Settings load failed'));
      
      const newContextManager = new ContextManager();
      
      // Allow time for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not throw and should disable the manager
      expect(newContextManager).toBeDefined();
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle Context Manager enabled state', async () => {
      mockStore.toggleEnabled.mockResolvedValue(undefined);
      
      const result = await contextManager.toggleEnabled(true);
      
      expect(mockStore.toggleEnabled).toHaveBeenCalledWith(true);
      expect(result).toHaveProperty('enabled', true);
      expect(result).toHaveProperty('liveBudget');
      expect(result).toHaveProperty('settings');
    });

    it('should toggle Context Manager disabled state', async () => {
      mockStore.toggleEnabled.mockResolvedValue(undefined);
      
      const result = await contextManager.toggleEnabled(false);
      
      expect(mockStore.toggleEnabled).toHaveBeenCalledWith(false);
      expect(result).toHaveProperty('enabled', false);
    });

    it('should handle toggle errors', async () => {
      mockStore.toggleEnabled.mockRejectedValue(new Error('Toggle failed'));
      
      await expect(contextManager.toggleEnabled(true)).rejects.toThrow('Toggle failed');
    });
  });

  describe('Stats Functionality', () => {
    it('should return comprehensive stats', async () => {
      const stats = await contextManager.getStats();
      
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('settings');
      expect(stats).toHaveProperty('usage');
      expect(stats).toHaveProperty('tokenizer');
      expect(stats).toHaveProperty('summarizer');
      expect(stats).toHaveProperty('optimizer');
      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('system');
      expect(stats).toHaveProperty('liveBudget');
      expect(stats).toHaveProperty('hardCap');
    });

    it('should include system health information', async () => {
      const stats = await contextManager.getStats();
      
      expect(stats.system).toHaveProperty('cache');
      expect(stats.system).toHaveProperty('circuitBreaker');
      expect(stats.system).toHaveProperty('health');
    });

    it('should handle stats errors gracefully', async () => {
      mockStore.loadSettings.mockRejectedValue(new Error('Stats failed'));
      
      await expect(contextManager.getStats()).rejects.toThrow('Stats failed');
    });
  });

  describe('Thread Preparation', () => {
    beforeEach(() => {
      // Mock OpenAI client methods
      const mockOpenAI = {
        beta: {
          threads: {
            messages: {
              list: jest.fn(),
              create: jest.fn(),
            },
            create: jest.fn(),
          },
        },
      };
      
      (contextManager as any).openai = mockOpenAI;
    });

    it('should handle passthrough when disabled', async () => {
      mockStore.loadSettings.mockResolvedValue({
        enabled: false,
        liveBudget: 12000,
        hardCap: 120000,
        autoOptimize: true,
        enablePiiStripping: true,
        debugMode: false,
        usage: {
          totalTokensUsed: 0,
          totalCost: 0,
          requestCount: 0,
          lastReset: new Date(),
        },
      });

      const result = await contextManager.prepareThreadForRun({
        assistantId: 'asst_test',
        newUserMessage: 'Test message',
      });

      expect(result.action).toBe('passthrough');
      expect(result.diagnostics.optimizationLevel).toBe('none');
    });

    it('should handle thread reuse for small threads', async () => {
      const mockMessages = {
        data: [
          { role: 'user', content: 'Short message' },
          { role: 'assistant', content: 'Short response' },
        ],
      };

      (contextManager as any).openai.beta.threads.messages.list.mockResolvedValue(mockMessages);

      const result = await contextManager.prepareThreadForRun({
        threadId: 'thread_test',
        assistantId: 'asst_test',
        newUserMessage: 'Test message',
      });

      expect(result.action).toBe('reuse_thread');
      expect(result.threadId).toBe('thread_test');
    });

    it('should handle errors gracefully', async () => {
      (contextManager as any).openai.beta.threads.messages.list.mockRejectedValue(
        new Error('OpenAI API error')
      );

      const result = await contextManager.prepareThreadForRun({
        threadId: 'thread_test',
        assistantId: 'asst_test',
        newUserMessage: 'Test message',
      });

      expect(result.action).toBe('passthrough');
      expect(result.recommendation).toContain('Context Manager hatası');
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', () => {
      expect(() => contextManager.clearAllCaches()).not.toThrow();
    });
  });

  describe('Manual Optimization', () => {
    it('should trigger manual optimization', async () => {
      const result = await contextManager.forceOptimization();
      
      // Should return some optimization result
      expect(result).toBeDefined();
    });

    it('should handle optimization errors', async () => {
      // Mock the usageOptimizer to throw an error
      const { usageOptimizer } = require('../usageOptimizer');
      usageOptimizer.optimizeUsage.mockRejectedValue(new Error('Optimization failed'));
      
      await expect(contextManager.forceOptimization()).rejects.toThrow('Optimization failed');
    });
  });

  describe('Message Content Extraction', () => {
    it('should extract string content', () => {
      const message = { content: 'Simple string content' };
      const result = (contextManager as any).extractMessageContent(message);
      
      expect(result).toBe('Simple string content');
    });

    it('should extract array content', () => {
      const message = {
        content: [
          { type: 'text', text: { value: 'First part' } },
          { type: 'text', text: 'Second part' },
          { type: 'image', url: 'http://example.com' }, // Non-text should be filtered
        ],
      };
      
      const result = (contextManager as any).extractMessageContent(message);
      
      expect(result).toBe('First part Second part');
    });

    it('should handle nested text content', () => {
      const message = {
        content: {
          text: {
            value: 'Nested content',
          },
        },
      };
      
      const result = (contextManager as any).extractMessageContent(message);
      
      expect(result).toBe('Nested content');
    });

    it('should return empty string for invalid content', () => {
      const message = { content: null };
      const result = (contextManager as any).extractMessageContent(message);
      
      expect(result).toBe('');
    });
  });

  describe('Language Detection', () => {
    it('should detect Turkish language', () => {
      const turkishText = 'Merhaba, nasılsınız? Bu bir Türkçe metin.';
      const result = (contextManager as any).detectLanguage(turkishText);
      
      expect(result).toBe('tr');
    });

    it('should detect English language', () => {
      const englishText = 'Hello, how are you? This is an English text.';
      const result = (contextManager as any).detectLanguage(englishText);
      
      expect(result).toBe('en');
    });

    it('should default to English for ambiguous text', () => {
      const ambiguousText = '123 456 789';
      const result = (contextManager as any).detectLanguage(ambiguousText);
      
      expect(result).toBe('en');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost correctly', () => {
      const tokens = 1000;
      const result = (contextManager as any).calculateCost(tokens);
      
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });
  });

  describe('Live Budget Calculation', () => {
    it('should return minimum of optimizer and settings budget', () => {
      const result = (contextManager as any).calculateLiveBudget(10000, 15000);
      expect(result).toBe(10000);
      
      const result2 = (contextManager as any).calculateLiveBudget(20000, 15000);
      expect(result2).toBe(15000);
    });
  });
});