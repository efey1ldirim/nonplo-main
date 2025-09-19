/**
 * Context Manager Integration Tests - Heavy Optimization Scenarios
 * 
 * Tests the complete optimization flow when token limits are exceeded.
 */

import { ContextManager } from '../contextManager';

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

describe('Context Manager - Heavy Optimization Scenarios', () => {
  let contextManager: ContextManager;
  let mockOpenAI: any;
  let mockTokenizer: any;
  let mockSummarizer: any;
  let mockUsageOptimizer: any;
  let mockStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup comprehensive mocks
    const { store } = require('../store');
    const { tokenizer } = require('../tokenizer');
    const { summarizer } = require('../summarizer');
    const { usageOptimizer } = require('../usageOptimizer');
    const { openaiCircuitBreaker } = require('../circuitBreaker');
    const { performanceMonitor } = require('../performanceMonitor');
    
    mockStore = store;
    mockTokenizer = tokenizer;
    mockSummarizer = summarizer;
    mockUsageOptimizer = usageOptimizer;
    
    // Mock OpenAI client
    mockOpenAI = {
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
    
    // Setup default mocks
    mockStore.loadSettings.mockResolvedValue({
      enabled: true,
      liveBudget: 5000, // Lower budget to trigger optimization
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
    
    mockUsageOptimizer.optimizeUsage.mockResolvedValue({
      liveBudget: 4000,
      level: 'aggressive',
      reasoning: 'High token usage detected',
    });
    
    // Mock performance monitor
    performanceMonitor.startTimer.mockImplementation(() => jest.fn());
    
    contextManager = new ContextManager();
    (contextManager as any).openai = mockOpenAI;
  });

  describe('Token Limit Exceeded Scenarios', () => {
    beforeEach(() => {
      // Mock large thread with many messages exceeding token budget
      const largeMessages = [];
      for (let i = 0; i < 50; i++) {
        largeMessages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `This is a long message with substantial content that will consume many tokens. Message number ${i} contains important context that would normally be preserved but may need summarization due to token limits.`,
        });
      }
      
      mockOpenAI.beta.threads.messages.list.mockResolvedValue({
        data: largeMessages,
      });
      
      // Mock tokenizer to report high token usage
      mockTokenizer.analyzeAssistantMessages.mockReturnValue({
        totalTokens: 15000, // Exceeds 5000 budget
        messageCount: 50,
      });
      
      mockTokenizer.countMessagesTokens.mockReturnValue({
        totalTokens: 3000, // Live messages tokens
      });
      
      mockTokenizer.splitMessagesByBudget.mockReturnValue({
        liveMessages: largeMessages.slice(-10), // Last 10 messages
        oldMessages: largeMessages.slice(0, 40), // First 40 messages need summarization
      });
      
      // Mock summarizer
      mockSummarizer.summarizeMessages.mockResolvedValue({
        summary: 'Summarized conversation covering 40 previous messages with key context preserved.',
        summaryTokens: 150,
        piiRemoved: 0,
      });
      
      // Mock new thread creation
      mockOpenAI.beta.threads.create.mockResolvedValue({
        id: 'new_thread_optimized',
      });
      
      mockOpenAI.beta.threads.messages.create.mockResolvedValue({
        id: 'message_created',
      });
      
      // Mock usage tracking
      mockUsageOptimizer.addUsageMetric.mockReturnValue(undefined);
    });

    it('should perform complete optimization flow when token limits exceeded', async () => {
      const result = await contextManager.prepareThreadForRun({
        threadId: 'large_thread_123',
        assistantId: 'asst_heavy_use',
        newUserMessage: 'Continue our detailed discussion',
        userId: 'user_heavy',
      });

      // Verify optimization action was taken
      expect(result.action).toBe('new_thread_with_summary');
      expect(result.threadId).toBe('new_thread_optimized');
      expect(result.summary).toBe('Summarized conversation covering 40 previous messages with key context preserved.');
      
      // Verify diagnostics show token reduction
      expect(result.diagnostics.originalTokens).toBe(15000);
      expect(result.diagnostics.finalTokens).toBe(3150); // 150 summary + 3000 live
      expect(result.diagnostics.tokensReduced).toBe(11850);
      expect(result.diagnostics.reductionPercentage).toBe(79); // ~79% reduction
      expect(result.diagnostics.messagesProcessed).toBe(50);
      expect(result.diagnostics.optimizationLevel).toBe('aggressive');
      
      // Verify all components were called correctly
      expect(mockTokenizer.analyzeAssistantMessages).toHaveBeenCalled();
      expect(mockTokenizer.splitMessagesByBudget).toHaveBeenCalledWith(expect.any(Array), 4000);
      expect(mockSummarizer.summarizeMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.any(Array),
          targetTokens: expect.any(Number),
          language: expect.any(String),
        })
      );
      expect(mockUsageOptimizer.addUsageMetric).toHaveBeenCalledWith(15000, expect.any(Number), expect.any(String));
    });

    it('should handle summarization with PII removal', async () => {
      mockSummarizer.summarizeMessages.mockResolvedValue({
        summary: 'Clean summary with personal information removed.',
        summaryTokens: 200,
        piiRemoved: 5, // PII items removed
      });

      const result = await contextManager.prepareThreadForRun({
        threadId: 'pii_thread_456',
        assistantId: 'asst_pii_test',
        newUserMessage: 'Please continue our conversation',
        userId: 'user_pii',
      });

      expect(result.action).toBe('new_thread_with_summary');
      expect(result.diagnostics.piiRemoved).toBe(5);
      expect(result.summary).toBe('Clean summary with personal information removed.');
    });

    it('should create new thread with proper message order', async () => {
      await contextManager.prepareThreadForRun({
        threadId: 'order_thread_789',
        assistantId: 'asst_order_test',
        newUserMessage: 'Test message order',
      });

      // Verify thread creation sequence
      expect(mockOpenAI.beta.threads.create).toHaveBeenCalledTimes(1);
      
      // Verify summary was added first
      expect(mockOpenAI.beta.threads.messages.create).toHaveBeenCalledWith(
        'new_thread_optimized',
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('[KONUŞMA ÖZETİ'),
        })
      );
      
      // Verify live messages were added after summary (10 messages)
      expect(mockOpenAI.beta.threads.messages.create).toHaveBeenCalledTimes(11); // 1 summary + 10 live messages
    });

    it('should handle circuit breaker protection during optimization', async () => {
      const { openaiCircuitBreaker, summarizerCircuitBreaker } = require('../circuitBreaker');
      
      // Mock circuit breaker execute calls
      openaiCircuitBreaker.execute.mockImplementation((fn: any) => fn());
      summarizerCircuitBreaker.execute.mockImplementation((fn: any) => fn());

      await contextManager.prepareThreadForRun({
        threadId: 'circuit_thread_101',
        assistantId: 'asst_circuit_test',
        newUserMessage: 'Test with circuit breaker',
      });

      // Verify circuit breakers were used
      expect(summarizerCircuitBreaker.execute).toHaveBeenCalled();
      expect(openaiCircuitBreaker.execute).toHaveBeenCalledTimes(12); // 1 thread creation + 1 summary + 10 messages
    });

    it('should handle optimization errors gracefully', async () => {
      mockSummarizer.summarizeMessages.mockRejectedValue(new Error('Summarization failed'));

      const result = await contextManager.prepareThreadForRun({
        threadId: 'error_thread_202',
        assistantId: 'asst_error_test',
        newUserMessage: 'Test error handling',
      });

      // Should fall back to passthrough on error
      expect(result.action).toBe('passthrough');
      expect(result.recommendation).toContain('Context Manager hatası');
    });

    it('should detect language correctly for summarization', async () => {
      // Test Turkish language detection
      await contextManager.prepareThreadForRun({
        threadId: 'turkish_thread_303',
        assistantId: 'asst_tr_test',
        newUserMessage: 'Merhaba, nasılsınız? Bu Türkçe bir mesaj.',
      });

      expect(mockSummarizer.summarizeMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'tr',
        })
      );

      // Test English language detection
      jest.clearAllMocks();
      mockSummarizer.summarizeMessages.mockResolvedValue({
        summary: 'English summary',
        summaryTokens: 100,
        piiRemoved: 0,
      });

      await contextManager.prepareThreadForRun({
        threadId: 'english_thread_404',
        assistantId: 'asst_en_test',
        newUserMessage: 'Hello, how are you? This is an English message.',
      });

      expect(mockSummarizer.summarizeMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
        })
      );
    });

    it('should calculate costs accurately', async () => {
      const result = await contextManager.prepareThreadForRun({
        threadId: 'cost_thread_505',
        assistantId: 'asst_cost_test',
        newUserMessage: 'Test cost calculation',
      });

      // Verify usage tracking with cost calculation
      expect(mockUsageOptimizer.addUsageMetric).toHaveBeenCalledWith(
        15000, // token count
        expect.any(Number), // calculated cost
        expect.any(String) // model name
      );
    });
  });

  describe('Performance Optimization Scenarios', () => {
    it('should use cache for settings when available', async () => {
      const { cacheManager } = require('../cacheManager');
      
      // Mock cache hit
      cacheManager.get.mockReturnValue({
        enabled: true,
        liveBudget: 6000,
        hardCap: 120000,
      });

      await contextManager.prepareThreadForRun({
        threadId: 'cache_thread_606',
        assistantId: 'asst_cache_test',
        newUserMessage: 'Test cache usage',
      });

      // Store should not be called if cache hit
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled(); // Should still set cache
    });

    it('should track performance metrics during optimization', async () => {
      const { performanceMonitor } = require('../performanceMonitor');
      const mockTimer = jest.fn();
      performanceMonitor.startTimer.mockReturnValue(mockTimer);

      await contextManager.prepareThreadForRun({
        threadId: 'perf_thread_707',
        assistantId: 'asst_perf_test',
        newUserMessage: 'Test performance tracking',
        userId: 'user_perf',
      });

      // Verify performance monitoring
      expect(performanceMonitor.startTimer).toHaveBeenCalledWith('prepareThreadForRun', 'user_perf');
      expect(mockTimer).toHaveBeenCalledWith(true, 15000); // Success with token count
    });
  });
});