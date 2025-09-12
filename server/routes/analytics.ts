import { Request, Response } from 'express';
import { analyticsManager } from '../analytics/AnalyticsManager';
import { storage } from '../database/storage';

// Get analytics dashboard data
export const getAnalyticsDashboard = async (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as string) || 'day';
    const analytics = analyticsManager.getAnalytics(timeframe as any);

    // Get business metrics from database
    const businessMetrics = await getBusinessMetricsFromDB();
    
    res.json({
      ...analytics,
      businessMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting analytics dashboard:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get real-time metrics
export const getRealTimeMetrics = (req: Request, res: Response) => {
  try {
    const metrics = analyticsManager.getRealTimeMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get real-time metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get user behavior analytics
export const getUserBehavior = (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 7;
    
    const behavior = analyticsManager.getUserBehavior(userId, days);
    res.json(behavior);
  } catch (error) {
    console.error('Error getting user behavior:', error);
    res.status(500).json({ 
      error: 'Failed to get user behavior data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get performance analytics
export const getPerformanceAnalytics = (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as string) || 'day';
    const analytics = analyticsManager.getAnalytics(timeframe as any);
    
    // Filter performance-related events
    const performanceEvents = analytics.recentEvents.filter(
      event => event.event === 'performance_metric' || event.event === 'slow_request'
    );

    // Calculate average response times
    const responseTimes = performanceEvents
      .filter(e => e.event === 'performance_metric')
      .map(e => e.properties.duration);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Group by API endpoint
    const endpointPerformance = performanceEvents.reduce((acc, event) => {
      const endpoint = `${event.properties.method} ${event.properties.path}`;
      if (!acc[endpoint]) {
        acc[endpoint] = {
          count: 0,
          totalDuration: 0,
          slowRequests: 0,
          errors: 0
        };
      }
      
      acc[endpoint].count++;
      if (event.properties.duration) {
        acc[endpoint].totalDuration += event.properties.duration;
      }
      if (event.event === 'slow_request') {
        acc[endpoint].slowRequests++;
      }
      if (event.properties.statusCode >= 400) {
        acc[endpoint].errors++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.keys(endpointPerformance).forEach(endpoint => {
      const perf = endpointPerformance[endpoint];
      perf.avgDuration = perf.count > 0 ? perf.totalDuration / perf.count : 0;
      perf.errorRate = perf.count > 0 ? (perf.errors / perf.count) * 100 : 0;
      perf.slowRequestRate = perf.count > 0 ? (perf.slowRequests / perf.count) * 100 : 0;
    });

    res.json({
      overview: {
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        totalRequests: performanceEvents.length,
        slowRequests: performanceEvents.filter(e => e.event === 'slow_request').length,
        errorRate: 0 // Calculate from status codes
      },
      endpointPerformance,
      recentSlowRequests: performanceEvents
        .filter(e => e.event === 'slow_request')
        .slice(-10),
      timeframe,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error getting performance analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get performance analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get error analytics
export const getErrorAnalytics = (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as string) || 'day';
    const analytics = analyticsManager.getAnalytics(timeframe as any);
    
    const errorEvents = analytics.recentEvents.filter(event => event.event === 'error');
    
    // Group errors by type
    const errorsByType = errorEvents.reduce((acc, event) => {
      const errorType = event.properties.errorMessage?.split(':')[0] || 'Unknown Error';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group errors by endpoint
    const errorsByEndpoint = errorEvents.reduce((acc, event) => {
      const endpoint = `${event.properties.method} ${event.properties.path}`;
      acc[endpoint] = (acc[endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Error rate trend (simplified)
    const totalEvents = analytics.totalEvents;
    const errorRate = totalEvents > 0 ? (errorEvents.length / totalEvents) * 100 : 0;

    res.json({
      overview: {
        totalErrors: errorEvents.length,
        errorRate: Math.round(errorRate * 100) / 100,
        uniqueErrorTypes: Object.keys(errorsByType).length
      },
      errorsByType: Object.entries(errorsByType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([type, count]) => ({ type, count })),
      errorsByEndpoint: Object.entries(errorsByEndpoint)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
      recentErrors: errorEvents.slice(-20),
      timeframe,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error getting error analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get error analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Track custom event
export const trackEvent = (req: Request, res: Response) => {
  try {
    const { event, properties } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    analyticsManager.trackEvent({
      event,
      userId: req.analyticsUserId,
      sessionId: req.sessionId,
      timestamp: new Date(),
      properties: properties || {}
    });

    res.json({ success: true, message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ 
      error: 'Failed to track event',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to get business metrics from database
async function getBusinessMetricsFromDB() {
  try {
    // Get user metrics
    const users = await storage.getAllUsers();
    const agents = await storage.getAllAgents();
    const conversations = await storage.getAllConversations();
    
    // Calculate metrics
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active users (users who logged in in the last 24 hours)
    const activeUsers = users.filter(user => 
      user.lastLoginAt && new Date(user.lastLoginAt) > oneDayAgo
    ).length;

    // New users (created in the last week)
    const newUsers = users.filter(user => 
      new Date(user.createdAt) > oneWeekAgo
    ).length;

    // Active agents (agents that have had conversations in the last week)
    const activeAgents = agents.filter(agent => agent.isActive).length;

    // Recent conversations
    const recentConversations = conversations.filter(conv => 
      new Date(conv.createdAt) > oneWeekAgo
    );

    return {
      totalUsers: users.length,
      activeUsers,
      newUsers,
      totalAgents: agents.length,
      activeAgents,
      totalConversations: conversations.length,
      recentConversations: recentConversations.length,
      avgConversationLength: conversations.length > 0 
        ? conversations.reduce((acc, conv) => acc + (conv.messages?.length || 0), 0) / conversations.length
        : 0,
      timestamp: now
    };
  } catch (error) {
    console.error('Error getting business metrics from DB:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      totalAgents: 0,
      activeAgents: 0,
      totalConversations: 0,
      recentConversations: 0,
      avgConversationLength: 0,
      timestamp: new Date()
    };
  }
}