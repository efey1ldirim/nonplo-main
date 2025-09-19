/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures by temporarily blocking requests to failing services.
 * Used for OpenAI API calls to handle rate limits and failures gracefully.
 */

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  successCount: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private failureWindow: number[] = [];

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 60000, // 1 minute
      monitoringWindow: config.monitoringWindow || 300000, // 5 minutes
    };

    this.state = {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED',
      successCount: 0,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    
    // Clean old failures from monitoring window
    this.cleanOldFailures(now);

    // Check circuit state
    if (this.state.state === 'OPEN') {
      if (now - this.state.lastFailure > this.config.resetTimeout) {
        this.state.state = 'HALF_OPEN';
        this.state.successCount = 0;
        console.log('🔄 Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - request blocked');
      }
    }

    try {
      const result = await fn();
      this.onSuccess(now);
      return result;
    } catch (error: any) {
      this.onFailure(now, error);
      throw error;
    }
  }

  private onSuccess(timestamp: number): void {
    if (this.state.state === 'HALF_OPEN') {
      this.state.successCount++;
      if (this.state.successCount >= 3) {
        this.state.state = 'CLOSED';
        this.state.failures = 0;
        this.failureWindow = [];
        console.log('✅ Circuit breaker reset to CLOSED after successful recovery');
      }
    } else if (this.state.state === 'CLOSED') {
      // Reset failure count on success
      this.state.failures = Math.max(0, this.state.failures - 1);
    }
  }

  private onFailure(timestamp: number, error: any): void {
    this.failureWindow.push(timestamp);
    this.state.failures++;
    this.state.lastFailure = timestamp;

    console.warn(`⚠️  Circuit breaker failure recorded: ${error.message}`);
    console.log(`🔍 Current failures: ${this.state.failures}/${this.config.failureThreshold}`);

    if (this.state.failures >= this.config.failureThreshold) {
      this.state.state = 'OPEN';
      console.error('🚫 Circuit breaker OPENED - blocking requests');
    }
  }

  private cleanOldFailures(now: number): void {
    const cutoff = now - this.config.monitoringWindow;
    this.failureWindow = this.failureWindow.filter(timestamp => timestamp > cutoff);
    
    // Update failure count based on cleaned window
    this.state.failures = this.failureWindow.length;
  }

  getState(): { state: string; failures: number; isOpen: boolean } {
    return {
      state: this.state.state,
      failures: this.state.failures,
      isOpen: this.state.state === 'OPEN',
    };
  }

  reset(): void {
    this.state = {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED',
      successCount: 0,
    };
    this.failureWindow = [];
    console.log('🔄 Circuit breaker manually reset');
  }
}

// Global circuit breaker instances
export const openaiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds for OpenAI
  monitoringWindow: 120000, // 2 minutes
});

export const summarizerCircuitBreaker = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 60000, // 1 minute for summarization
  monitoringWindow: 300000, // 5 minutes
});