/**
 * Context Manager Index
 * Tüm context manager modüllerini export eder
 */

// Ana context manager
export { contextManager, ContextManager } from './contextManager';

// Alt modüller
export { tokenizer, Tokenizer } from './tokenizer';
export { summarizer, Summarizer } from './summarizer';
export { usageOptimizer, UsageOptimizer } from './usageOptimizer';
export { store, Store } from './store';
export { privacy, Privacy } from './privacy';

// Konfigürasyon
export * from './config';

// Type exports
export interface ContextManagerStats {
  enabled: boolean;
  settings: any;
  usage: any;
  tokenizer: any;
  summarizer: any;
  optimizer: any;
  performance: {
    totalThreadsProcessed: number;
    totalTokensSaved: number;
    averageReductionPercentage: number;
  };
}

export interface PrepareThreadRequest {
  threadId?: string;
  assistantId: string;
  newUserMessage: string;
  modelCtxLimit?: number;
  userId?: string;
  agentId?: string;
}

export interface PrepareThreadResponse {
  threadId: string;
  action: 'passthrough' | 'reuse_thread' | 'new_thread_with_summary';
  summary?: string;
  diagnostics: {
    originalTokens: number;
    finalTokens: number;
    tokensReduced: number;
    reductionPercentage: number;
    messagesProcessed: number;
    piiRemoved: number;
    optimizationLevel: string;
    processingTime: number;
  };
  recommendation?: string;
}