interface LoadTestConfig {
  baseUrl: string;
  concurrent: number;
  duration: number; // seconds
  rampUp: number; // seconds
  endpoints: TestEndpoint[];
}

interface TestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  weight: number; // probability weight
  headers?: Record<string, string>;
  body?: any;
  auth?: boolean;
}

interface TestResult {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  error?: string;
  timestamp: number;
}

interface LoadTestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: Record<string, number>;
  endpointStats: Record<string, {
    requests: number;
    avgTime: number;
    errors: number;
  }>;
}

class LoadTester {
  private results: TestResult[] = [];
  private activeRequests = 0;
  private testConfig: LoadTestConfig;

  constructor(config: LoadTestConfig) {
    this.testConfig = config;
  }

  async runLoadTest(): Promise<LoadTestSummary> {
    console.log(`🚀 Starting load test: ${this.testConfig.concurrent} concurrent users for ${this.testConfig.duration}s`);
    
    this.results = [];
    const startTime = Date.now();
    const endTime = startTime + (this.testConfig.duration * 1000);

    // Ramp up users gradually
    const rampUpInterval = (this.testConfig.rampUp * 1000) / this.testConfig.concurrent;
    
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < this.testConfig.concurrent; i++) {
      const promise = new Promise<void>((resolve) => {
        setTimeout(() => {
          this.simulateUser(endTime).then(resolve);
        }, i * rampUpInterval);
      });
      promises.push(promise);
    }

    await Promise.all(promises);
    
    return this.generateSummary();
  }

  private async simulateUser(endTime: number): Promise<void> {
    while (Date.now() < endTime) {
      try {
        const endpoint = this.selectRandomEndpoint();
        const result = await this.makeRequest(endpoint);
        this.results.push(result);
        
        // Random delay between requests (0.5-2 seconds)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
      } catch (error) {
        console.error('User simulation error:', error);
        break;
      }
    }
  }

  private selectRandomEndpoint(): TestEndpoint {
    const totalWeight = this.testConfig.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of this.testConfig.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return this.testConfig.endpoints[0];
  }

  private async makeRequest(endpoint: TestEndpoint): Promise<TestResult> {
    const startTime = Date.now();
    this.activeRequests++;

    try {
      const url = `${this.testConfig.baseUrl}${endpoint.path}`;
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...endpoint.headers
        }
      };

      if (endpoint.auth) {
        // Add mock auth header for testing
        options.headers = {
          ...options.headers,
          'Authorization': 'Bearer test-token'
        };
      }

      if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        options.body = JSON.stringify(endpoint.body);
      }

      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;

      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        responseTime,
        status: response.status,
        timestamp: startTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        responseTime,
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: startTime
      };
    } finally {
      this.activeRequests--;
    }
  }

  private generateSummary(): LoadTestSummary {
    if (this.results.length === 0) {
      throw new Error('No test results available');
    }

    const successful = this.results.filter(r => r.status >= 200 && r.status < 400);
    const failed = this.results.filter(r => r.status === 0 || r.status >= 400);
    
    const responseTimes = successful.map(r => r.responseTime);
    const testDuration = (Math.max(...this.results.map(r => r.timestamp)) - 
                         Math.min(...this.results.map(r => r.timestamp))) / 1000;

    // Error analysis
    const errors: Record<string, number> = {};
    failed.forEach(result => {
      const key = result.error || `HTTP ${result.status}`;
      errors[key] = (errors[key] || 0) + 1;
    });

    // Endpoint statistics
    const endpointStats: Record<string, { requests: number; avgTime: number; errors: number }> = {};
    this.results.forEach(result => {
      const key = `${result.method} ${result.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = { requests: 0, avgTime: 0, errors: 0 };
      }
      endpointStats[key].requests++;
      endpointStats[key].avgTime += result.responseTime;
      if (result.status === 0 || result.status >= 400) {
        endpointStats[key].errors++;
      }
    });

    // Calculate averages
    Object.values(endpointStats).forEach(stat => {
      stat.avgTime = Math.round(stat.avgTime / stat.requests);
    });

    return {
      totalRequests: this.results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime: Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: Math.round(this.results.length / testDuration),
      errorRate: Math.round((failed.length / this.results.length) * 100 * 100) / 100,
      errors,
      endpointStats
    };
  }

  // Predefined test scenarios
  static createApiLoadTest(baseUrl: string = 'http://localhost:5000'): LoadTester {
    return new LoadTester({
      baseUrl,
      concurrent: 10,
      duration: 60,
      rampUp: 10,
      endpoints: [
        {
          path: '/api/agents?userId=550e8400-e29b-41d4-a716-446655440000',
          method: 'GET',
          weight: 40,
          auth: false
        },
        {
          path: '/api/agents/01e1580f-5327-4a63-a46f-5d535b698fbb?userId=550e8400-e29b-41d4-a716-446655440000',
          method: 'GET',
          weight: 30,
          auth: false
        },
        {
          path: '/api/agents',
          method: 'POST',
          weight: 15,
          auth: false,
          body: {
            userId: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Load Test Agent',
            role: 'Test Assistant',
            isActive: true
          }
        },
        {
          path: '/api/newsletter/subscribe',
          method: 'POST',
          weight: 10,
          body: {
            email: 'loadtest@example.com'
          }
        },
        {
          path: '/api/contact',
          method: 'POST',
          weight: 5,
          body: {
            name: 'Load Test User',
            email: 'loadtest@example.com',
            message: 'This is a load test message'
          }
        }
      ]
    });
  }

  static createStressTest(baseUrl: string = 'http://localhost:5000'): LoadTester {
    const apiTest = this.createApiLoadTest(baseUrl);
    apiTest.testConfig.concurrent = 50;
    apiTest.testConfig.duration = 300; // 5 minutes
    apiTest.testConfig.rampUp = 30;
    return apiTest;
  }
}

export { LoadTester, type LoadTestConfig, type LoadTestSummary };