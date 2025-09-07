interface TestCase {
  name: string;
  description: string;
  test: () => Promise<TestResult>;
  category: 'api' | 'database' | 'auth' | 'realtime' | 'storage';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface TestResult {
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
}

interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: Array<{
    name: string;
    category: string;
    priority: string;
    passed: boolean;
    duration: number;
    error?: string;
  }>;
}

class E2ETestRunner {
  private baseUrl: string;
  private testUserId: string = '550e8400-e29b-41d4-a716-446655440000';

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  async runAllTests(): Promise<TestSuiteResult[]> {
    const testSuites = this.getTestSuites();
    const results: TestSuiteResult[] = [];

    for (const suite of testSuites) {
      const result = await this.runTestSuite(suite);
      results.push(result);
      
      console.log(`\n📊 ${suite.name}: ${result.passedTests}/${result.totalTests} passed`);
      
      // Log failed tests
      result.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`❌ ${r.name}: ${r.error}`));
    }

    return results;
  }

  private async runTestSuite(suite: TestSuite): Promise<TestSuiteResult> {
    console.log(`\n🧪 Running test suite: ${suite.name}`);
    const startTime = Date.now();
    const results: TestSuiteResult['results'] = [];

    for (const testCase of suite.tests) {
      const testStartTime = Date.now();
      
      try {
        const result = await testCase.test();
        const duration = Date.now() - testStartTime;

        results.push({
          name: testCase.name,
          category: testCase.category,
          priority: testCase.priority,
          passed: result.passed,
          duration,
          error: result.error
        });

        const status = result.passed ? '✅' : '❌';
        console.log(`  ${status} ${testCase.name} (${duration}ms)`);
        
      } catch (error) {
        const duration = Date.now() - testStartTime;
        results.push({
          name: testCase.name,
          category: testCase.category,
          priority: testCase.priority,
          passed: false,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.log(`  ❌ ${testCase.name} (${duration}ms) - ${error}`);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const totalDuration = Date.now() - startTime;
    const passedTests = results.filter(r => r.passed).length;

    return {
      suiteName: suite.name,
      totalTests: results.length,
      passedTests,
      failedTests: results.length - passedTests,
      duration: totalDuration,
      results
    };
  }

  private getTestSuites(): TestSuite[] {
    return [
      this.getApiTestSuite(),
      this.getDatabaseTestSuite(),
      this.getPerformanceTestSuite(),
      this.getSecurityTestSuite()
    ];
  }

  private getApiTestSuite(): TestSuite {
    return {
      name: 'API Endpoints',
      tests: [
        {
          name: 'Get user agents',
          description: 'Fetch agents for a user',
          category: 'api',
          priority: 'critical',
          test: async () => {
            const response = await fetch(`${this.baseUrl}/api/agents?userId=${this.testUserId}`);
            const data = await response.json();
            
            return {
              passed: response.ok && Array.isArray(data),
              duration: 0,
              details: { status: response.status, dataLength: data.length }
            };
          }
        },
        {
          name: 'Newsletter subscription',
          description: 'Subscribe to newsletter',
          category: 'api',
          priority: 'medium',
          test: async () => {
            const testEmail = `test-${Date.now()}@example.com`;
            const response = await fetch(`${this.baseUrl}/api/newsletter/subscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: testEmail })
            });
            
            return {
              passed: response.ok,
              duration: 0,
              details: { status: response.status }
            };
          }
        },
        {
          name: 'Contact form submission',
          description: 'Submit contact form',
          category: 'api',
          priority: 'medium',
          test: async () => {
            const response = await fetch(`${this.baseUrl}/api/contact`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: 'E2E Test',
                email: 'e2etest@example.com',
                message: 'This is an automated test message'
              })
            });
            
            return {
              passed: response.ok,
              duration: 0,
              details: { status: response.status }
            };
          }
        },
        {
          name: 'Agent creation wizard',
          description: 'Create agent via wizard endpoint',
          category: 'api',
          priority: 'critical',
          test: async () => {
            const wizardData = {
              basicInfo: {
                name: `E2E Test Agent ${Date.now()}`,
                businessName: 'E2E Test Company',
                sector: 'Technology',
                location: 'Test City'
              },
              role: 'Customer Support Specialist',
              personality: {
                tone: 'Professional',
                responseLength: 'Medium',
                userVerification: 'Required'
              }
            };

            const response = await fetch(`${this.baseUrl}/api/agents/wizard`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: this.testUserId,
                wizardData
              })
            });

            const data = response.ok ? await response.json() : null;
            
            return {
              passed: response.ok && data?.id,
              duration: 0,
              details: { status: response.status, agentCreated: !!data?.id }
            };
          }
        }
      ]
    };
  }

  private getDatabaseTestSuite(): TestSuite {
    return {
      name: 'Database Operations',
      tests: [
        {
          name: 'Database connectivity',
          description: 'Check database connection',
          category: 'database',
          priority: 'critical',
          test: async () => {
            // Test by making a simple API call that requires DB
            const response = await fetch(`${this.baseUrl}/api/agents?userId=${this.testUserId}`);
            
            return {
              passed: response.ok,
              duration: 0,
              details: { status: response.status }
            };
          }
        },
        {
          name: 'Query performance',
          description: 'Check query response times',
          category: 'database',
          priority: 'high',
          test: async () => {
            const startTime = Date.now();
            const response = await fetch(`${this.baseUrl}/api/agents?userId=${this.testUserId}`);
            const queryTime = Date.now() - startTime;
            
            return {
              passed: response.ok && queryTime < 2000, // Under 2 seconds
              duration: queryTime,
              details: { queryTime, status: response.status }
            };
          }
        }
      ]
    };
  }

  private getPerformanceTestSuite(): TestSuite {
    return {
      name: 'Performance Tests',
      tests: [
        {
          name: 'Response time under load',
          description: 'Check response times with multiple requests',
          category: 'api',
          priority: 'high',
          test: async () => {
            const promises = Array.from({ length: 5 }, () => 
              fetch(`${this.baseUrl}/api/agents?userId=${this.testUserId}`)
            );
            
            const startTime = Date.now();
            const responses = await Promise.all(promises);
            const totalTime = Date.now() - startTime;
            
            const allSuccessful = responses.every(r => r.ok);
            const averageTime = totalTime / promises.length;
            
            return {
              passed: allSuccessful && averageTime < 1000,
              duration: totalTime,
              details: { averageTime, allSuccessful }
            };
          }
        }
      ]
    };
  }

  private getSecurityTestSuite(): TestSuite {
    return {
      name: 'Security Tests',
      tests: [
        {
          name: 'CORS headers',
          description: 'Check CORS configuration',
          category: 'api',
          priority: 'medium',
          test: async () => {
            const response = await fetch(`${this.baseUrl}/api/agents?userId=${this.testUserId}`);
            const hasCors = response.headers.get('access-control-allow-origin') !== null;
            
            return {
              passed: hasCors,
              duration: 0,
              details: { hasCors }
            };
          }
        },
        {
          name: 'Rate limiting',
          description: 'Test rate limiting functionality',
          category: 'api',
          priority: 'medium',
          test: async () => {
            // Make rapid requests to trigger rate limiting
            const promises = Array.from({ length: 10 }, () => 
              fetch(`${this.baseUrl}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Rate Test', email: 'test@test.com', message: 'test' })
              })
            );
            
            const responses = await Promise.all(promises);
            const rateLimited = responses.some(r => r.status === 429);
            
            return {
              passed: rateLimited, // Should be rate limited
              duration: 0,
              details: { rateLimited, totalRequests: promises.length }
            };
          }
        }
      ]
    };
  }

  // Data consistency validation methods
  async validateDataConsistency(): Promise<{
    passed: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if agents have valid user associations
      const agentsResponse = await fetch(`${this.baseUrl}/api/agents?userId=${this.testUserId}`);
      if (!agentsResponse.ok) {
        issues.push('Cannot fetch agents for data consistency check');
      } else {
        const agents = await agentsResponse.json();
        agents.forEach((agent: any, index: number) => {
          if (!agent.userId) {
            issues.push(`Agent ${index} missing userId`);
          }
          if (!agent.name || !agent.role) {
            issues.push(`Agent ${index} missing required fields`);
          }
        });
      }

    } catch (error) {
      issues.push(`Data consistency check failed: ${error}`);
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }
}

export { E2ETestRunner, type TestSuiteResult };