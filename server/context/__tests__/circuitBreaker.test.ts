/**
 * Circuit Breaker Unit Tests
 * 
 * Tests circuit breaker state transitions and behavior under various failure scenarios.
 */

import { CircuitBreaker } from '../circuitBreaker';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  
  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000, // 1 second for testing
      monitoringWindow: 5000, // 5 seconds for testing
    });
  });

  describe('Initial State', () => {
    it('should start in CLOSED state with zero failures', () => {
      const state = circuitBreaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failures).toBe(0);
      expect(state.isOpen).toBe(false);
    });
  });

  describe('Success Scenarios', () => {
    it('should execute successful functions normally', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failures).toBe(0);
    });

    it('should reduce failure count on success after failures', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('test error'));
      const successFn = jest.fn().mockResolvedValue('success');
      
      // Cause some failures
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      
      let state = circuitBreaker.getState();
      expect(state.failures).toBe(2);
      
      // Then succeed
      await circuitBreaker.execute(successFn);
      
      state = circuitBreaker.getState();
      expect(state.failures).toBe(1); // Should reduce by 1
    });
  });

  describe('Failure Scenarios', () => {
    it('should track failures correctly', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      
      const state = circuitBreaker.getState();
      expect(state.failures).toBe(1);
      expect(state.state).toBe('CLOSED');
    });

    it('should open circuit after reaching failure threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Cause failures to reach threshold (3)
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('OPEN');
      expect(state.isOpen).toBe(true);
      expect(state.failures).toBe(3);
    });

    it('should block requests when circuit is OPEN', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      // Next call should be blocked
      const successFn = jest.fn().mockResolvedValue('success');
      await expect(circuitBreaker.execute(successFn)).rejects.toThrow('Circuit breaker is OPEN');
      
      // The function should not have been called
      expect(successFn).not.toHaveBeenCalled();
    });
  });

  describe('State Transitions', () => {
    it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      expect(circuitBreaker.getState().state).toBe('OPEN');
      
      // Wait for reset timeout (1 second + small buffer)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Next execution should transition to HALF_OPEN
      const successFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('HALF_OPEN');
    });

    it('should transition from HALF_OPEN to CLOSED after 3 successes', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Execute 3 successful calls to close the circuit
      const successFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failures).toBe(0);
    });

    it('should return to OPEN if failure occurs in HALF_OPEN state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // One success to enter HALF_OPEN
      const successFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);
      expect(circuitBreaker.getState().state).toBe('HALF_OPEN');
      
      // Failure in HALF_OPEN should return to OPEN
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('OPEN');
    });
  });

  describe('Failure Window Management', () => {
    it('should clean old failures outside monitoring window', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Create initial failures
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      expect(circuitBreaker.getState().failures).toBe(2);
      
      // Wait for monitoring window to expire (5 seconds + buffer)
      await new Promise(resolve => setTimeout(resolve, 5500));
      
      // New execution should trigger cleanup
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      // Should only have 1 failure (the new one, old ones cleaned)
      const state = circuitBreaker.getState();
      expect(state.failures).toBe(1);
    });
  });

  describe('Manual Reset', () => {
    it('should reset circuit to CLOSED state manually', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      expect(circuitBreaker.getState().state).toBe('OPEN');
      
      // Manual reset
      circuitBreaker.reset();
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failures).toBe(0);
      expect(state.isOpen).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration values', () => {
      const customCircuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 2000,
        monitoringWindow: 10000,
      });
      
      // This is tested implicitly through behavior, but we can at least verify
      // the circuit breaker was created successfully
      expect(customCircuitBreaker.getState().state).toBe('CLOSED');
    });

    it('should use default values when no config provided', () => {
      const defaultCircuitBreaker = new CircuitBreaker();
      
      expect(defaultCircuitBreaker.getState().state).toBe('CLOSED');
      expect(defaultCircuitBreaker.getState().failures).toBe(0);
    });
  });
});