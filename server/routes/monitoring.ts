import { Request, Response } from 'express';
import { metricsCollector } from '../monitoring/metricsCollector';
import { cacheManager } from '../performance/cacheManager';
import { queryAnalyzer } from '../performance/queryAnalyzer';
import { LoadTester } from '../testing/loadTester';
import { E2ETestRunner } from '../testing/e2eTestSuite';

// Health check endpoint
export const healthCheck = (req: Request, res: Response) => {
  const health = metricsCollector.getSystemHealth();
  const latestMetrics = metricsCollector.getLatestMetrics();
  
  res.status(health.status === 'critical' ? 503 : 200).json({
    status: health.status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    score: health.score,
    issues: health.issues,
    metrics: latestMetrics ? {
      memory: latestMetrics.memory,
      api: latestMetrics.api,
      database: latestMetrics.database
    } : null
  });
};

// System metrics endpoint
export const getMetrics = (req: Request, res: Response) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const history = metricsCollector.getMetricsHistory(hours);
  const latest = metricsCollector.getLatestMetrics();
  const userActivity = metricsCollector.getUserActivitySummary();

  res.json({
    latest,
    history,
    userActivity: userActivity.slice(0, 50), // Limit to 50 users
    summary: {
      totalMetricsCollected: history.length,
      averageMemoryUsage: history.length > 0 
        ? Math.round(history.reduce((sum, m) => sum + m.memory.percentage, 0) / history.length)
        : 0,
      averageResponseTime: latest?.api.averageResponseTime || 0,
      activeUsers: latest?.api.activeUsers || 0
    }
  });
};

// Cache statistics
export const getCacheStats = (req: Request, res: Response) => {
  const stats = cacheManager.getStats();
  res.json({
    cache: stats,
    operations: {
      clear: 'DELETE /api/monitoring/cache',
      invalidateUser: 'DELETE /api/monitoring/cache/user/:userId'
    }
  });
};

// Clear cache
export const clearCache = (req: Request, res: Response) => {
  cacheManager.clear();
  res.json({ message: 'Cache cleared successfully' });
};

// Invalidate user cache
export const invalidateUserCache = (req: Request, res: Response) => {
  const { userId } = req.params;
  cacheManager.invalidateUserData(userId);
  res.json({ message: `Cache invalidated for user ${userId}` });
};

// Query performance stats
export const getQueryStats = (req: Request, res: Response) => {
  const stats = queryAnalyzer.getQueryStats();
  const slowQueries = queryAnalyzer.getSlowQueries();
  const indexSuggestions = queryAnalyzer.generateIndexSuggestions();

  res.json({
    stats,
    slowQueries: slowQueries.slice(0, 10), // Last 10 slow queries
    indexSuggestions,
    actions: {
      createIndexes: 'POST /api/monitoring/optimize-indexes',
      clearMetrics: 'DELETE /api/monitoring/query-metrics'
    }
  });
};

// Create optimized indexes
export const createOptimizedIndexes = async (req: Request, res: Response) => {
  try {
    const success = await queryAnalyzer.createOptimizedIndexes();
    res.json({
      success,
      message: success 
        ? 'Database indexes created successfully' 
        : 'Index creation failed, check logs'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create indexes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Clear query metrics
export const clearQueryMetrics = (req: Request, res: Response) => {
  queryAnalyzer.clearMetrics();
  res.json({ message: 'Query metrics cleared successfully' });
};

// Run load test
export const runLoadTest = async (req: Request, res: Response) => {
  try {
    const testType = req.query.type as string || 'api';
    const baseUrl = req.query.baseUrl as string || 'http://localhost:5000';

    let loadTester: LoadTester;
    
    if (testType === 'stress') {
      loadTester = LoadTester.createStressTest(baseUrl);
    } else {
      loadTester = LoadTester.createApiLoadTest(baseUrl);
    }

    // Run load test (this will take some time)
    const results = await loadTester.runLoadTest();
    
    res.json({
      testType,
      results,
      summary: {
        performance: results.averageResponseTime < 200 ? 'excellent' : 
                    results.averageResponseTime < 500 ? 'good' : 
                    results.averageResponseTime < 1000 ? 'fair' : 'poor',
        reliability: results.errorRate < 1 ? 'excellent' :
                    results.errorRate < 5 ? 'good' :
                    results.errorRate < 10 ? 'fair' : 'poor'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Load test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Run end-to-end tests
export const runE2ETests = async (req: Request, res: Response) => {
  try {
    const baseUrl = req.query.baseUrl as string || 'http://localhost:5000';
    const testRunner = new E2ETestRunner(baseUrl);
    
    const results = await testRunner.runAllTests();
    const dataConsistency = await testRunner.validateDataConsistency();
    
    const totalTests = results.reduce((sum, r) => sum + r.totalTests, 0);
    const passedTests = results.reduce((sum, r) => sum + r.passedTests, 0);
    const overallPass = (passedTests / totalTests) * 100;
    
    res.json({
      summary: {
        totalSuites: results.length,
        totalTests,
        passedTests,
        passPercentage: Math.round(overallPass),
        status: overallPass >= 90 ? 'excellent' : 
               overallPass >= 80 ? 'good' : 
               overallPass >= 70 ? 'fair' : 'poor'
      },
      results,
      dataConsistency,
      recommendations: generateTestRecommendations(results)
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'E2E tests failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Generate test recommendations
function generateTestRecommendations(results: any[]): string[] {
  const recommendations: string[] = [];
  
  results.forEach(suite => {
    const failedCritical = suite.results.filter((r: any) => 
      !r.passed && r.priority === 'critical'
    );
    
    if (failedCritical.length > 0) {
      recommendations.push(
        `Critical issues in ${suite.suiteName}: ${failedCritical.map((r: any) => r.name).join(', ')}`
      );
    }
    
    const slowTests = suite.results.filter((r: any) => r.duration > 1000);
    if (slowTests.length > 0) {
      recommendations.push(
        `Performance concern in ${suite.suiteName}: slow response times detected`
      );
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('All tests passing! System is operating well.');
  }
  
  return recommendations;
}