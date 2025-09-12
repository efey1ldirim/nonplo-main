import { Request, Response } from 'express';

// Comprehensive analytics and monitoring system
export interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  properties: Record<string, any>;
  metadata?: {
    userAgent?: string;
    ip?: string;
    referrer?: string;
    page?: string;
  };
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  pageViews: number;
  events: number;
  userAgent: string;
  ip: string;
  referrer?: string;
}

export interface BusinessMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalAgents: number;
  activeAgents: number;
  totalConversations: number;
  avgConversationLength: number;
  totalRevenue: number;
  conversionRate: number;
  timestamp: Date;
}

export class AnalyticsManager {
  private static instance: AnalyticsManager;
  private events: AnalyticsEvent[] = [];
  private sessions: Map<string, UserSession> = new Map();
  private businessMetrics: BusinessMetrics[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory

  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  // Track user events
  trackEvent(event: AnalyticsEvent): void {
    this.events.push(event);
    
    // Maintain event limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update session if exists
    if (event.sessionId) {
      const session = this.sessions.get(event.sessionId);
      if (session) {
        session.lastActivity = new Date();
        session.events++;
      }
    }

    console.log(`📊 Event tracked: ${event.event} for user ${event.userId || 'anonymous'}`);
  }

  // Create or update user session
  createSession(sessionId: string, metadata: {
    userId?: string;
    userAgent: string;
    ip: string;
    referrer?: string;
  }): UserSession {
    const session: UserSession = {
      sessionId,
      userId: metadata.userId,
      startTime: new Date(),
      lastActivity: new Date(),
      pageViews: 0,
      events: 0,
      userAgent: metadata.userAgent,
      ip: metadata.ip,
      referrer: metadata.referrer
    };

    this.sessions.set(sessionId, session);
    
    // Track session start event
    this.trackEvent({
      event: 'session_start',
      userId: metadata.userId,
      sessionId,
      timestamp: new Date(),
      properties: {
        userAgent: metadata.userAgent,
        referrer: metadata.referrer
      }
    });

    return session;
  }

  // Track page view
  trackPageView(sessionId: string, page: string, userId?: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pageViews++;
      session.lastActivity = new Date();
    }

    this.trackEvent({
      event: 'page_view',
      userId,
      sessionId,
      timestamp: new Date(),
      properties: { page },
      metadata: { page }
    });
  }

  // Track business metrics
  updateBusinessMetrics(metrics: Partial<BusinessMetrics>): void {
    const currentMetrics: BusinessMetrics = {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      totalAgents: 0,
      activeAgents: 0,
      totalConversations: 0,
      avgConversationLength: 0,
      totalRevenue: 0,
      conversionRate: 0,
      timestamp: new Date(),
      ...metrics
    };

    this.businessMetrics.push(currentMetrics);
    
    // Keep last 1000 metrics entries
    if (this.businessMetrics.length > 1000) {
      this.businessMetrics = this.businessMetrics.slice(-1000);
    }
  }

  // Get analytics data for dashboards
  getAnalytics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    const timeframes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    const cutoff = new Date(now.getTime() - timeframes[timeframe]);
    
    // Filter events by timeframe
    const filteredEvents = this.events.filter(event => event.timestamp >= cutoff);
    const filteredSessions = Array.from(this.sessions.values())
      .filter(session => session.startTime >= cutoff);

    // Calculate metrics
    const uniqueUsers = new Set(filteredEvents
      .filter(e => e.userId)
      .map(e => e.userId)).size;

    const pageViews = filteredEvents.filter(e => e.event === 'page_view').length;
    const totalEvents = filteredEvents.length;

    // Popular pages
    const pageViewEvents = filteredEvents.filter(e => e.event === 'page_view');
    const pageStats = pageViewEvents.reduce((acc, event) => {
      const page = event.properties.page || 'unknown';
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Event types breakdown
    const eventTypes = filteredEvents.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Session analytics
    const avgSessionDuration = filteredSessions.length > 0
      ? filteredSessions.reduce((acc, session) => {
          return acc + (session.lastActivity.getTime() - session.startTime.getTime());
        }, 0) / filteredSessions.length / 1000 / 60 // Convert to minutes
      : 0;

    return {
      overview: {
        uniqueUsers,
        totalSessions: filteredSessions.length,
        pageViews,
        totalEvents,
        avgSessionDuration: Math.round(avgSessionDuration * 100) / 100
      },
      popularPages: Object.entries(pageStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([page, views]) => ({ page, views })),
      eventTypes: Object.entries(eventTypes)
        .sort(([,a], [,b]) => b - a)
        .map(([event, count]) => ({ event, count })),
      sessions: filteredSessions.slice(-50), // Last 50 sessions
      recentEvents: filteredEvents.slice(-100), // Last 100 events
      timeframe,
      generatedAt: new Date()
    };
  }

  // Get user behavior analytics
  getUserBehavior(userId: string, days: number = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const userEvents = this.events.filter(event => 
      event.userId === userId && event.timestamp >= cutoff
    );

    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.startTime >= cutoff);

    // User journey analysis
    const pageFlow = userEvents
      .filter(e => e.event === 'page_view')
      .map(e => e.properties.page)
      .slice(-20); // Last 20 page views

    // Feature usage
    const featureUsage = userEvents
      .filter(e => e.event !== 'page_view' && e.event !== 'session_start')
      .reduce((acc, event) => {
        acc[event.event] = (acc[event.event] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      userId,
      totalEvents: userEvents.length,
      totalSessions: userSessions.length,
      pageFlow,
      featureUsage,
      lastActivity: userEvents.length > 0 
        ? userEvents[userEvents.length - 1].timestamp 
        : null,
      timeframe: `${days} days`
    };
  }

  // Get real-time metrics for dashboard
  getRealTimeMetrics() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentEvents = this.events.filter(e => e.timestamp >= fiveMinutesAgo);
    const hourlyEvents = this.events.filter(e => e.timestamp >= oneHourAgo);
    
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => session.lastActivity >= fiveMinutesAgo);

    const currentUsers = new Set(recentEvents
      .filter(e => e.userId)
      .map(e => e.userId)).size;

    return {
      currentUsers,
      activeSessions: activeSessions.length,
      eventsLast5Min: recentEvents.length,
      eventsLastHour: hourlyEvents.length,
      recentActivity: recentEvents.slice(-10),
      timestamp: now
    };
  }

  // Clear old data periodically
  cleanup(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Remove old events
    this.events = this.events.filter(event => event.timestamp > oneWeekAgo);
    
    // Remove old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < oneWeekAgo) {
        this.sessions.delete(sessionId);
      }
    }

    // Remove old business metrics
    this.businessMetrics = this.businessMetrics.filter(
      metric => metric.timestamp > oneWeekAgo
    );

    console.log('🧹 Analytics cleanup completed');
  }
}

export const analyticsManager = AnalyticsManager.getInstance();

// Start cleanup interval (run every hour)
setInterval(() => {
  analyticsManager.cleanup();
}, 60 * 60 * 1000);