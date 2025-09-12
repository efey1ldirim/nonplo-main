import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

/**
 * API Call Optimization and Batching Manager
 * Handles external API calls with retry logic, timeout optimization, and connection pooling
 */

interface ApiRequestConfig extends AxiosRequestConfig {
  retries?: number;
  retryDelay?: number;
  priority?: 'high' | 'medium' | 'low';
  batchable?: boolean;
}

interface BatchRequest {
  id: string;
  config: ApiRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  currentConnections: number;
  batchedRequests: number;
}

class ApiOptimizer {
  // Dialogflow instance removed - no longer using Dialogflow
  private googleApiInstance: AxiosInstance;
  private generalInstance: AxiosInstance;
  
  private pendingBatches: Map<string, BatchRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private metrics: ApiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    currentConnections: 0,
    batchedRequests: 0
  };
  
  private responseTimes: number[] = [];
  
  constructor() {
    // Create HTTPS agents with connection pooling for secure endpoints
    const httpsAgent = new HttpsAgent({
      keepAlive: true,
      maxSockets: 10,          // Reduced for serverless environment
      maxFreeSockets: 5,       // Keep 5 free connections
      timeout: 60000,          // Socket timeout
      freeSocketTimeout: 30000 // Free socket timeout
    });

    // Create HTTP agent for non-secure endpoints
    const httpAgent = new HttpAgent({
      keepAlive: true,
      maxSockets: 10,
      maxFreeSockets: 5,
      timeout: 60000,
      freeSocketTimeout: 30000
    });

    // Dialogflow instance removed - no longer using Dialogflow

    // Optimized Google APIs instance  
    this.googleApiInstance = axios.create({
      baseURL: 'https://www.googleapis.com',
      timeout: 30000,           // Reduced from 60s to 30s for Google APIs
      httpsAgent: httpsAgent,   // Use httpsAgent for HTTPS
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Nonplo-API-Client/1.0'
      },
      maxRedirects: 3,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // General purpose instance for other external APIs
    this.generalInstance = axios.create({
      timeout: 15000,           // General timeout 15s
      httpsAgent: httpsAgent,   // Default to HTTPS
      httpAgent: httpAgent,     // Fallback for HTTP
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Nonplo-API-Client/1.0'
      },
      maxRedirects: 2,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for metrics
    const requestInterceptor = (config: any) => {
      this.metrics.totalRequests++;
      this.metrics.currentConnections++;
      config.metadata = { startTime: Date.now() };
      return config;
    };

    // Response interceptor for metrics and error handling
    const responseInterceptor = (response: AxiosResponse) => {
      this.metrics.currentConnections--;
      this.metrics.successfulRequests++;
      
      const responseTime = Date.now() - response.config.metadata?.startTime;
      this.responseTimes.push(responseTime);
      
      // Keep only last 100 response times for average calculation
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift();
      }
      
      this.metrics.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
      
      return response;
    };

    const errorInterceptor = (error: any) => {
      this.metrics.currentConnections--;
      this.metrics.failedRequests++;
      return Promise.reject(error);
    };

    // Apply interceptors to all instances
    [this.googleApiInstance, this.generalInstance].forEach(instance => {
      instance.interceptors.request.use(requestInterceptor);
      instance.interceptors.response.use(responseInterceptor, errorInterceptor);
    });
  }

  /**
   * Optimized request method with retry logic and intelligent routing
   */
  async request<T = any>(config: ApiRequestConfig): Promise<T> {
    const { retries = 3, retryDelay = 1000, priority = 'medium', ...axiosConfig } = config;
    
    // Choose appropriate instance based on URL
    let instance = this.generalInstance;
    if (config.url?.includes('googleapis.com')) {
      instance = this.googleApiInstance;
    }

    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await instance.request<T>(axiosConfig);
        return response.data;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          break;
        }
        
        // Exponential backoff for retries
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
          await this.delay(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Batch multiple requests for efficiency
   */
  async batchRequest<T = any>(requests: ApiRequestConfig[]): Promise<T[]> {
    const batchPromises = requests.map(config => this.request<T>(config));
    
    try {
      const results = await Promise.allSettled(batchPromises);
      this.metrics.batchedRequests += requests.length;
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Batch request ${index} failed:`, result.reason);
          throw result.reason;
        }
      });
    } catch (error) {
      console.error('Batch request failed:', error);
      throw error;
    }
  }

  // Dialogflow detectIntent method removed - no longer using Dialogflow

  // Dialogflow createPlaybook method removed - now using PLAYBOOK ONLY architecture

  /**
   * Optimized Google Calendar API calls
   */
  async calendarRequest(
    path: string,
    token: string,
    options: { method?: string; data?: any; timeout?: number; retries?: number } = {}
  ): Promise<any> {
    const { method = 'GET', data, timeout = 30000, retries = 2 } = options;
    
    return this.request({
      method: method as any,
      url: path,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout,
      retries,
      priority: 'medium'
    });
  }

  /**
   * Batch Google Calendar operations
   */
  async batchCalendarRequests(requests: Array<{
    path: string;
    method?: string;
    data?: any;
    token: string;
  }>): Promise<any[]> {
    const batchConfigs = requests.map(req => ({
      method: (req.method || 'GET') as any,
      url: req.path,
      data: req.data,
      headers: {
        'Authorization': `Bearer ${req.token}`,
      },
      timeout: 30000,
      retries: 2,
      priority: 'medium' as const
    }));

    return this.batchRequest(batchConfigs);
  }

  /**
   * Health check for API connections
   */
  async healthCheck(): Promise<{
    googleApi: boolean;
    general: boolean;
    metrics: ApiMetrics;
  }> {
    const results = {
      googleApi: false,
      general: false,
      metrics: this.metrics
    };

    // Dialogflow health check removed - no longer using Dialogflow

    try {
      // Test Google API connection
      await this.googleApiInstance.get('/oauth2/v1/userinfo', { 
        timeout: 5000,
        validateStatus: () => true // Accept any status for health check
      });
      results.googleApi = true;
    } catch (error) {
      console.error('Google API health check failed:', error.message);
    }

    try {
      // Test general connection with a simple request
      await this.generalInstance.get('https://httpbin.org/status/200', { timeout: 5000 });
      results.general = true;
    } catch (error) {
      console.error('General API health check failed:', error.message);
    }

    return results;
  }

  /**
   * Get current API metrics
   */
  getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      currentConnections: 0,
      batchedRequests: 0
    };
    this.responseTimes = [];
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close all connections and cleanup
   */
  destroy(): void {
    // Clear batch timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    this.pendingBatches.clear();
  }
}

// Singleton instance
export const apiOptimizer = new ApiOptimizer();

// Convenience methods for backward compatibility
export const optimizedAxios = {
  get: (url: string, config?: ApiRequestConfig) => 
    apiOptimizer.request({ ...config, method: 'GET', url }),
  
  post: (url: string, data?: any, config?: ApiRequestConfig) => 
    apiOptimizer.request({ ...config, method: 'POST', url, data }),
  
  put: (url: string, data?: any, config?: ApiRequestConfig) => 
    apiOptimizer.request({ ...config, method: 'PUT', url, data }),
  
  patch: (url: string, data?: any, config?: ApiRequestConfig) => 
    apiOptimizer.request({ ...config, method: 'PATCH', url, data }),
  
  delete: (url: string, config?: ApiRequestConfig) => 
    apiOptimizer.request({ ...config, method: 'DELETE', url })
};

// Export types
export type { ApiRequestConfig, ApiMetrics };