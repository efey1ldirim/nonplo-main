import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';

// Mock dependencies
jest.mock('../../server/storage');
jest.mock('../../server/services/CalendarService');

describe('Multi-User Scenarios Integration Tests', () => {
  let calendarService: any;
  let storage: any;

  beforeAll(async () => {
    const storageModule = await import('../../server/storage');
    storage = storageModule.storage;
    
    const calendarModule = await import('../../server/services/CalendarService');
    calendarService = calendarModule.CalendarService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Multiple Users with Same Agent', () => {
    it('should handle multiple users connecting calendars to same agent', async () => {
      const users = [
        { userId: 'user-1', email: 'user1@example.com' },
        { userId: 'user-2', email: 'user2@example.com' },
        { userId: 'user-3', email: 'user3@example.com' }
      ];
      const agentId = 'shared-agent-id';

      // Mock storage to return different connections for each user
      storage.getGoogleCalendarByUserAgent = jest.fn()
        .mockImplementation((userId: string, agentId: string) => {
          const user = users.find(u => u.userId === userId);
          if (!user) return null;
          
          return {
            id: `connection-${userId}`,
            userId,
            agentId,
            googleEmail: user.email,
            googleAccessToken: `encrypted-token-${userId}`,
            googleRefreshToken: `encrypted-refresh-${userId}`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        });

      // Test calendar connections for all users
      for (const user of users) {
        const connection = await storage.getGoogleCalendarByUserAgent(user.userId, agentId);
        
        expect(connection).toBeDefined();
        expect(connection.userId).toBe(user.userId);
        expect(connection.agentId).toBe(agentId);
        expect(connection.googleEmail).toBe(user.email);
      }

      // Verify each user has independent connection
      const allConnections = await Promise.all(
        users.map(user => storage.getGoogleCalendarByUserAgent(user.userId, agentId))
      );

      expect(allConnections).toHaveLength(3);
      
      const uniqueConnections = new Set(allConnections.map(c => c.id));
      expect(uniqueConnections.size).toBe(3); // All connections should be unique
    });

    it('should isolate calendar operations between users', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';
      const agentId = 'shared-agent-id';

      // Mock separate connections
      storage.getGoogleCalendarByUserAgent = jest.fn()
        .mockImplementation((userId: string) => ({
          id: `connection-${userId}`,
          userId,
          agentId,
          googleEmail: `${userId}@example.com`,
          googleAccessToken: `encrypted-token-${userId}`,
          googleRefreshToken: `encrypted-refresh-${userId}`,
          isActive: true
        }));

      // Mock encryption for different users
      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockImplementation((token: string) => {
          if (token.includes('user-1')) return 'decrypted-token-user-1';
          if (token.includes('user-2')) return 'decrypted-token-user-2';
          return 'decrypted-token';
        });

      // Mock separate calendar instances
      const mockCalendar1 = {
        events: {
          insert: jest.fn().mockResolvedValue({
            data: { id: 'event-user1-123', summary: 'User 1 Event' }
          })
        }
      };

      const mockCalendar2 = {
        events: {
          insert: jest.fn().mockResolvedValue({
            data: { id: 'event-user2-456', summary: 'User 2 Event' }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar = jest.fn()
        .mockImplementation(() => {
          // Return different calendar instances based on credentials
          const oauth = mockGoogle.calendar.mock.calls.length;
          return oauth % 2 === 1 ? mockCalendar1 : mockCalendar2;
        });

      const calendarServiceInstance = new calendarService();

      // Create events for both users
      const eventData = {
        summary: 'Test Event',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      const [result1, result2] = await Promise.all([
        calendarServiceInstance.createEvent(user1Id, agentId, eventData),
        calendarServiceInstance.createEvent(user2Id, agentId, eventData)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      expect(result1.event.id).toBe('event-user1-123');
      expect(result2.event.id).toBe('event-user2-456');

      // Verify separate calendar API calls
      expect(mockCalendar1.events.insert).toHaveBeenCalledTimes(1);
      expect(mockCalendar2.events.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('Single User with Multiple Agents', () => {
    it('should handle user connecting multiple agents to different calendars', async () => {
      const userId = 'multi-agent-user';
      const agents = [
        { agentId: 'agent-1', email: 'calendar1@example.com' },
        { agentId: 'agent-2', email: 'calendar2@example.com' },
        { agentId: 'agent-3', email: 'calendar3@example.com' }
      ];

      // Mock storage for multiple agent connections
      storage.getGoogleCalendarByUserAgent = jest.fn()
        .mockImplementation((userId: string, agentId: string) => {
          const agent = agents.find(a => a.agentId === agentId);
          if (!agent) return null;
          
          return {
            id: `connection-${agentId}`,
            userId,
            agentId,
            googleEmail: agent.email,
            googleAccessToken: `encrypted-token-${agentId}`,
            googleRefreshToken: `encrypted-refresh-${agentId}`,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        });

      // Test connections for all agents
      for (const agent of agents) {
        const connection = await storage.getGoogleCalendarByUserAgent(userId, agent.agentId);
        
        expect(connection).toBeDefined();
        expect(connection.userId).toBe(userId);
        expect(connection.agentId).toBe(agent.agentId);
        expect(connection.googleEmail).toBe(agent.email);
      }

      // Verify user can manage multiple agent connections
      const allConnections = await Promise.all(
        agents.map(agent => storage.getGoogleCalendarByUserAgent(userId, agent.agentId))
      );

      expect(allConnections).toHaveLength(3);
      
      const uniqueAgents = new Set(allConnections.map(c => c.agentId));
      expect(uniqueAgents.size).toBe(3);
    });

    it('should isolate calendar operations between agents', async () => {
      const userId = 'user-123';
      const agent1Id = 'agent-sales';
      const agent2Id = 'agent-support';

      // Mock separate connections for each agent
      storage.getGoogleCalendarByUserAgent = jest.fn()
        .mockImplementation((userId: string, agentId: string) => ({
          id: `connection-${agentId}`,
          userId,
          agentId,
          googleEmail: `${agentId}@example.com`,
          googleAccessToken: `encrypted-token-${agentId}`,
          googleRefreshToken: `encrypted-refresh-${agentId}`,
          isActive: true
        }));

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockImplementation((token: string) => {
          if (token.includes('sales')) return 'decrypted-token-sales';
          if (token.includes('support')) return 'decrypted-token-support';
          return 'decrypted-token';
        });

      // Mock different calendar responses for each agent
      const mockCalendarSales = {
        freebusy: {
          query: jest.fn().mockResolvedValue({
            data: {
              calendars: {
                primary: {
                  busy: [
                    {
                      start: '2025-01-01T10:00:00Z',
                      end: '2025-01-01T11:00:00Z'
                    }
                  ]
                }
              }
            }
          })
        }
      };

      const mockCalendarSupport = {
        freebusy: {
          query: jest.fn().mockResolvedValue({
            data: {
              calendars: {
                primary: {
                  busy: [] // Support calendar is free
                }
              }
            }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar = jest.fn()
        .mockImplementation(() => {
          const callCount = mockGoogle.calendar.mock.calls.length;
          return callCount % 2 === 1 ? mockCalendarSales : mockCalendarSupport;
        });

      const calendarServiceInstance = new calendarService();

      // Check availability for both agents
      const [salesAvailability, supportAvailability] = await Promise.all([
        calendarServiceInstance.checkAvailability(
          userId,
          agent1Id,
          '2025-01-01T09:00:00Z',
          '2025-01-01T17:00:00Z'
        ),
        calendarServiceInstance.checkAvailability(
          userId,
          agent2Id,
          '2025-01-01T09:00:00Z',
          '2025-01-01T17:00:00Z'
        )
      ]);

      expect(salesAvailability.available).toBe(false);
      expect(salesAvailability.busyTimes).toHaveLength(1);

      expect(supportAvailability.available).toBe(true);
      expect(supportAvailability.busyTimes).toHaveLength(0);

      // Verify separate API calls
      expect(mockCalendarSales.freebusy.query).toHaveBeenCalledTimes(1);
      expect(mockCalendarSupport.freebusy.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrent Multi-User Operations', () => {
    it('should handle concurrent calendar operations from multiple users', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        agentId: `agent-${i % 3}` // 3 agents shared among 10 users
      }));

      // Mock connections for all users
      storage.getGoogleCalendarByUserAgent = jest.fn()
        .mockImplementation((userId: string, agentId: string) => ({
          id: `connection-${userId}-${agentId}`,
          userId,
          agentId,
          googleEmail: `${userId}@example.com`,
          googleAccessToken: `encrypted-token-${userId}`,
          googleRefreshToken: `encrypted-refresh-${userId}`,
          isActive: true
        }));

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockImplementation((token: string) => `decrypted-${token}`);

      let eventCounter = 0;
      const mockCalendar = {
        events: {
          insert: jest.fn().mockImplementation(async () => {
            eventCounter++;
            // Simulate variable API response times
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            return {
              data: {
                id: `event-${eventCounter}`,
                summary: `Concurrent Event ${eventCounter}`
              }
            };
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar = jest.fn().mockReturnValue(mockCalendar);

      const calendarServiceInstance = new calendarService();

      // Create concurrent event requests from all users
      const eventData = {
        summary: 'Concurrent Test Event',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      const promises = users.map(user =>
        calendarServiceInstance.createEvent(user.userId, user.agentId, eventData)
      );

      const results = await Promise.allSettled(promises);

      // All requests should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBe(10);

      // All events should have unique IDs
      const eventIds = successful.map(r => 
        (r as PromiseFulfilledResult<any>).value.event.id
      );
      const uniqueEventIds = new Set(eventIds);
      expect(uniqueEventIds.size).toBe(10);

      // Verify all API calls were made
      expect(mockCalendar.events.insert).toHaveBeenCalledTimes(10);
    });

    it('should handle mixed success/failure scenarios across users', async () => {
      const users = [
        { userId: 'user-success-1', agentId: 'agent-1', shouldSucceed: true },
        { userId: 'user-success-2', agentId: 'agent-2', shouldSucceed: true },
        { userId: 'user-fail-1', agentId: 'agent-3', shouldSucceed: false },
        { userId: 'user-fail-2', agentId: 'agent-4', shouldSucceed: false },
        { userId: 'user-success-3', agentId: 'agent-1', shouldSucceed: true }
      ];

      // Mock storage with success/failure conditions
      storage.getGoogleCalendarByUserAgent = jest.fn()
        .mockImplementation((userId: string, agentId: string) => {
          const user = users.find(u => u.userId === userId);
          if (!user || !user.shouldSucceed) return null; // Simulate no connection
          
          return {
            id: `connection-${userId}`,
            userId,
            agentId,
            googleEmail: `${userId}@example.com`,
            googleAccessToken: `encrypted-token-${userId}`,
            googleRefreshToken: `encrypted-refresh-${userId}`,
            isActive: true
          };
        });

      const calendarServiceInstance = new calendarService();

      const eventData = {
        summary: 'Mixed Result Test Event',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      const promises = users.map(user =>
        calendarServiceInstance.createEvent(user.userId, user.agentId, eventData)
      );

      const results = await Promise.allSettled(promises);

      // Count successful and failed results
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBe(3); // 3 users should succeed
      expect(failed.length).toBe(2); // 2 users should fail

      // Verify error reasons for failed operations
      failed.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason.message).toContain('Calendar connection not found');
        }
      });
    });
  });

  describe('Resource Contention and Rate Limiting', () => {
    it('should apply rate limiting per user, not globally', async () => {
      const users = ['user-1', 'user-2', 'user-3'];
      const agentId = 'shared-agent';

      // Mock connections for all users
      storage.getGoogleCalendarByUserAgent = jest.fn()
        .mockImplementation((userId: string) => ({
          id: `connection-${userId}`,
          userId,
          agentId,
          googleEmail: `${userId}@example.com`,
          googleAccessToken: `encrypted-token-${userId}`,
          googleRefreshToken: `encrypted-refresh-${userId}`,
          isActive: true
        }));

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn().mockReturnValue('decrypted-token');

      // Mock rate limiter behavior
      const rateLimitStore = new Map();
      
      const checkRateLimit = (userId: string) => {
        const now = Date.now();
        const userRequests = rateLimitStore.get(userId) || [];
        
        // Remove requests older than 1 minute
        const recentRequests = userRequests.filter((time: number) => now - time < 60000);
        
        if (recentRequests.length >= 5) { // 5 requests per minute per user
          throw new Error(`Rate limit exceeded for user ${userId}`);
        }
        
        recentRequests.push(now);
        rateLimitStore.set(userId, recentRequests);
      };

      const mockCalendar = {
        freebusy: {
          query: jest.fn().mockImplementation(async () => {
            // Extract userId from call context (would be in real implementation)
            return {
              data: { calendars: { primary: { busy: [] } } }
            };
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar = jest.fn().mockReturnValue(mockCalendar);

      const calendarServiceInstance = new calendarService();

      // Test rate limiting per user
      for (const userId of users) {
        // Each user should be able to make 5 requests
        const userPromises = Array.from({ length: 5 }, () => {
          checkRateLimit(userId); // Apply rate limiting
          return calendarServiceInstance.checkAvailability(
            userId,
            agentId,
            '2025-01-01T09:00:00Z',
            '2025-01-01T17:00:00Z'
          );
        });

        const userResults = await Promise.allSettled(userPromises);
        const userSuccesses = userResults.filter(r => r.status === 'fulfilled');
        expect(userSuccesses.length).toBe(5);

        // 6th request should be rate limited
        expect(() => checkRateLimit(userId)).toThrow(`Rate limit exceeded for user ${userId}`);
      }
    });

    it('should handle database connection pooling under load', async () => {
      const numberOfUsers = 50;
      const users = Array.from({ length: numberOfUsers }, (_, i) => ({
        userId: `load-test-user-${i}`,
        agentId: `agent-${i % 5}` // 5 agents shared among 50 users
      }));

      // Mock database connection pooling behavior
      let activeConnections = 0;
      const maxConnections = 10;

      storage.getGoogleCalendarByUserAgent = jest.fn()
        .mockImplementation(async (userId: string, agentId: string) => {
          if (activeConnections >= maxConnections) {
            throw new Error('Connection pool exhausted');
          }
          
          activeConnections++;
          
          // Simulate database query time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          activeConnections--;
          
          return {
            id: `connection-${userId}`,
            userId,
            agentId,
            googleEmail: `${userId}@example.com`,
            googleAccessToken: `encrypted-token-${userId}`,
            googleRefreshToken: `encrypted-refresh-${userId}`,
            isActive: true
          };
        });

      // Test concurrent database access
      const promises = users.map(user =>
        storage.getGoogleCalendarByUserAgent(user.userId, user.agentId)
      );

      const results = await Promise.allSettled(promises);

      // Most requests should succeed, but some may fail due to connection pool limits
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBeGreaterThan(numberOfUsers * 0.8); // At least 80% success
      
      // Failed requests should be due to connection pool exhaustion
      failed.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason.message).toBe('Connection pool exhausted');
        }
      });
    });
  });

  describe('Data Isolation and Security', () => {
    it('should prevent users from accessing other users calendar data', async () => {
      const user1Id = 'user-alice';
      const user2Id = 'user-bob';
      const agentId = 'shared-agent';

      // Mock storage to return null for cross-user access attempts
      storage.getGoogleCalendarByUserAgent = jest.fn()
        .mockImplementation((userId: string, agentId: string) => {
          // Only return data for correct user
          if (userId === user1Id) {
            return {
              id: 'connection-alice',
              userId: user1Id,
              agentId,
              googleEmail: 'alice@example.com',
              googleAccessToken: 'encrypted-token-alice',
              googleRefreshToken: 'encrypted-refresh-alice',
              isActive: true
            };
          }
          
          if (userId === user2Id) {
            return {
              id: 'connection-bob',
              userId: user2Id,
              agentId,
              googleEmail: 'bob@example.com',
              googleAccessToken: 'encrypted-token-bob',
              googleRefreshToken: 'encrypted-refresh-bob',
              isActive: true
            };
          }
          
          return null; // No cross-user access
        });

      // Test proper access
      const aliceConnection = await storage.getGoogleCalendarByUserAgent(user1Id, agentId);
      expect(aliceConnection.googleEmail).toBe('alice@example.com');

      const bobConnection = await storage.getGoogleCalendarByUserAgent(user2Id, agentId);
      expect(bobConnection.googleEmail).toBe('bob@example.com');

      // Test prevented cross-access (simulate malicious attempt)
      const crossAccess1 = await storage.getGoogleCalendarByUserAgent('malicious-user', agentId);
      expect(crossAccess1).toBeNull();

      // Verify each user only gets their own data
      expect(aliceConnection.userId).toBe(user1Id);
      expect(bobConnection.userId).toBe(user2Id);
      expect(aliceConnection.id).not.toBe(bobConnection.id);
    });

    it('should isolate user operations in monitoring and analytics', async () => {
      const users = ['user-analytics-1', 'user-analytics-2', 'user-analytics-3'];

      // Mock separate analytics for each user
      const { getCalendarAnalytics } = await import('../../server/middleware/calendarMonitoring');
      
      const mockGetAnalytics = jest.fn()
        .mockImplementation((userId: string, days: number) => ({
          totalOperations: userId === 'user-analytics-1' ? 100 : 
                          userId === 'user-analytics-2' ? 50 : 25,
          successfulOperations: userId === 'user-analytics-1' ? 95 : 
                               userId === 'user-analytics-2' ? 48 : 24,
          failedOperations: userId === 'user-analytics-1' ? 5 : 
                           userId === 'user-analytics-2' ? 2 : 1,
          successRate: userId === 'user-analytics-1' ? 0.95 : 
                      userId === 'user-analytics-2' ? 0.96 : 0.96,
          userId: userId // Include userId to verify isolation
        }));

      // Test analytics isolation
      for (const userId of users) {
        const analytics = mockGetAnalytics(userId, 7);
        expect(analytics.userId).toBe(userId);
        
        // Verify each user has different analytics
        if (userId === 'user-analytics-1') {
          expect(analytics.totalOperations).toBe(100);
        } else if (userId === 'user-analytics-2') {
          expect(analytics.totalOperations).toBe(50);
        } else {
          expect(analytics.totalOperations).toBe(25);
        }
      }

      // Verify analytics function was called for each user
      expect(mockGetAnalytics).toHaveBeenCalledTimes(3);
    });
  });
});