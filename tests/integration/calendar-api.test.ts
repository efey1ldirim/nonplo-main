import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.mock('../../server/storage');
jest.mock('../../server/services/CalendarService');

describe('Calendar API Integration Tests', () => {
  let app: express.Express;
  let calendarService: any;
  let storage: any;

  beforeAll(async () => {
    // Set up Express app
    app = express();
    app.use(express.json());
    
    // Import routes
    const routesModule = await import('../../server/routes');
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const storageModule = await import('../../server/storage');
    storage = storageModule.storage;
    
    const calendarModule = await import('../../server/services/CalendarService');
    calendarService = calendarModule.CalendarService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Event Creation API', () => {
    it('should create calendar event successfully', async () => {
      const mockEventResult = {
        success: true,
        event: {
          id: 'event-123',
          summary: 'Test Meeting',
          start: { dateTime: '2025-01-01T10:00:00Z' },
          end: { dateTime: '2025-01-01T11:00:00Z' },
          htmlLink: 'https://calendar.google.com/event/123'
        }
      };

      calendarService.prototype.createEvent = jest.fn().mockResolvedValue(mockEventResult);

      const eventData = {
        summary: 'Test Meeting',
        description: 'Integration test meeting',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' },
        attendees: [{ email: 'attendee@example.com' }]
      };

      const response = await request(app)
        .post('/api/webhooks/calendar/create-event')
        .send({
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          eventData
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        event: mockEventResult.event
      });

      expect(calendarService.prototype.createEvent).toHaveBeenCalledWith(
        'test-user-id',
        'test-agent-id',
        eventData
      );
    });

    it('should handle event creation with minimal data', async () => {
      const mockEventResult = {
        success: true,
        event: {
          id: 'event-minimal',
          summary: 'Quick Meeting',
          start: { dateTime: '2025-01-01T14:00:00Z' },
          end: { dateTime: '2025-01-01T14:30:00Z' }
        }
      };

      calendarService.prototype.createEvent = jest.fn().mockResolvedValue(mockEventResult);

      const minimalEventData = {
        summary: 'Quick Meeting',
        start: { dateTime: '2025-01-01T14:00:00Z' },
        end: { dateTime: '2025-01-01T14:30:00Z' }
      };

      const response = await request(app)
        .post('/api/webhooks/calendar/create-event')
        .send({
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          eventData: minimalEventData
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.event.id).toBe('event-minimal');
    });

    it('should handle event creation conflicts', async () => {
      calendarService.prototype.createEvent = jest.fn().mockRejectedValue(
        new Error('Event conflicts with existing event')
      );

      const conflictingEventData = {
        summary: 'Conflicting Meeting',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      const response = await request(app)
        .post('/api/webhooks/calendar/create-event')
        .send({
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          eventData: conflictingEventData
        })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Event conflicts with existing event'
      });
    });

    it('should validate required event fields', async () => {
      const invalidEventData = {
        summary: 'Test Meeting'
        // Missing start and end times
      };

      const response = await request(app)
        .post('/api/webhooks/calendar/create-event')
        .send({
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          eventData: invalidEventData
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Event start and end times are required'
      });
    });

    it('should handle calendar connection not found', async () => {
      calendarService.prototype.createEvent = jest.fn().mockRejectedValue(
        new Error('Calendar connection not found')
      );

      const eventData = {
        summary: 'Test Meeting',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      const response = await request(app)
        .post('/api/webhooks/calendar/create-event')
        .send({
          userId: 'non-existent-user',
          agentId: 'test-agent-id',
          eventData
        })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Calendar connection not found'
      });
    });
  });

  describe('Availability Check API', () => {
    it('should check availability successfully', async () => {
      const mockAvailabilityResult = {
        available: true,
        busyTimes: [],
        freeSlots: [
          {
            start: '2025-01-01T09:00:00Z',
            end: '2025-01-01T17:00:00Z'
          }
        ]
      };

      calendarService.prototype.checkAvailability = jest.fn().mockResolvedValue(mockAvailabilityResult);

      const response = await request(app)
        .post('/api/webhooks/calendar/check-availability')
        .send({
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          timeMin: '2025-01-01T09:00:00Z',
          timeMax: '2025-01-01T17:00:00Z'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        ...mockAvailabilityResult
      });

      expect(calendarService.prototype.checkAvailability).toHaveBeenCalledWith(
        'test-user-id',
        'test-agent-id',
        '2025-01-01T09:00:00Z',
        '2025-01-01T17:00:00Z'
      );
    });

    it('should return busy times when calendar is occupied', async () => {
      const mockAvailabilityResult = {
        available: false,
        busyTimes: [
          {
            start: '2025-01-01T10:00:00Z',
            end: '2025-01-01T11:00:00Z'
          },
          {
            start: '2025-01-01T14:00:00Z',
            end: '2025-01-01T15:30:00Z'
          }
        ],
        freeSlots: [
          {
            start: '2025-01-01T09:00:00Z',
            end: '2025-01-01T10:00:00Z'
          },
          {
            start: '2025-01-01T11:00:00Z',
            end: '2025-01-01T14:00:00Z'
          }
        ]
      };

      calendarService.prototype.checkAvailability = jest.fn().mockResolvedValue(mockAvailabilityResult);

      const response = await request(app)
        .post('/api/webhooks/calendar/check-availability')
        .send({
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          timeMin: '2025-01-01T09:00:00Z',
          timeMax: '2025-01-01T17:00:00Z'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.available).toBe(false);
      expect(response.body.busyTimes).toHaveLength(2);
      expect(response.body.freeSlots).toHaveLength(2);
    });

    it('should validate time range parameters', async () => {
      const response = await request(app)
        .post('/api/webhooks/calendar/check-availability')
        .send({
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          timeMin: '2025-01-01T17:00:00Z',
          timeMax: '2025-01-01T09:00:00Z' // End before start
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'timeMax must be after timeMin'
      });
    });

    it('should handle availability check for disconnected calendar', async () => {
      calendarService.prototype.checkAvailability = jest.fn().mockRejectedValue(
        new Error('Calendar connection not found')
      );

      const response = await request(app)
        .post('/api/webhooks/calendar/check-availability')
        .send({
          userId: 'test-user-id',
          agentId: 'disconnected-agent-id',
          timeMin: '2025-01-01T09:00:00Z',
          timeMax: '2025-01-01T17:00:00Z'
        })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Calendar connection not found'
      });
    });
  });

  describe('Calendar Status API', () => {
    it('should return connected status for active calendar', async () => {
      const mockConnection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleEmail: 'test@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      storage.getGoogleCalendarConnection = jest.fn().mockResolvedValue(mockConnection);

      const response = await request(app)
        .get('/api/calendar/status')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        connected: true,
        connection: mockConnection
      });
    });

    it('should return disconnected status for non-existent calendar', async () => {
      storage.getGoogleCalendarConnection = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/calendar/status')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        connected: false,
        connection: null
      });
    });
  });

  describe('Calendar Disconnect API', () => {
    it('should disconnect calendar successfully', async () => {
      calendarService.prototype.disconnectCalendar = jest.fn().mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .post('/api/calendar/disconnect')
        .send({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Calendar disconnected successfully'
      });

      expect(calendarService.prototype.disconnectCalendar).toHaveBeenCalledWith(
        'test-user-id',
        'test-agent-id'
      );
    });

    it('should handle disconnect for non-existent connection', async () => {
      calendarService.prototype.disconnectCalendar = jest.fn().mockRejectedValue(
        new Error('Calendar connection not found')
      );

      const response = await request(app)
        .post('/api/calendar/disconnect')
        .send({
          userId: 'test-user-id',
          agentId: 'non-existent-agent'
        })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Calendar connection not found'
      });
    });
  });

  describe('Calendar Analytics API', () => {
    it('should return calendar usage analytics', async () => {
      const mockAnalytics = {
        totalOperations: 150,
        successfulOperations: 145,
        failedOperations: 5,
        successRate: 0.967,
        operationsByType: {
          'create_event': 75,
          'check_availability': 60,
          'update_event': 10,
          'delete_event': 5
        },
        recentActivity: [
          {
            date: '2025-01-01',
            operations: 25,
            successes: 24,
            failures: 1
          }
        ]
      };

      // Mock analytics function
      const mockGetAnalytics = jest.fn().mockReturnValue(mockAnalytics);
      
      const response = await request(app)
        .get('/api/calendar/analytics')
        .query({
          userId: 'test-user-id',
          days: 7
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        analytics: mockAnalytics
      });
    });

    it('should handle analytics for new user with no operations', async () => {
      const emptyAnalytics = {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        successRate: 0,
        operationsByType: {},
        recentActivity: []
      };

      const response = await request(app)
        .get('/api/calendar/analytics')
        .query({
          userId: 'new-user-id',
          days: 7
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics.totalOperations).toBe(0);
    });
  });

  describe('Calendar Health Check API', () => {
    it('should return healthy status for active connection', async () => {
      const mockConnection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleEmail: 'test@example.com',
        isActive: true,
        updatedAt: new Date()
      };

      storage.getGoogleCalendarConnection = jest.fn().mockResolvedValue(mockConnection);

      // Mock token expiry check
      const mockTokenStatus = {
        needsRefresh: false,
        expiresIn: 3600,
        warning: false
      };

      const response = await request(app)
        .get('/api/calendar/health')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        health: {
          connected: true,
          tokenValid: true,
          expiresIn: expect.any(Number),
          warning: false,
          email: 'test@example.com',
          lastUpdated: expect.any(String)
        }
      });
    });

    it('should return warning for expiring tokens', async () => {
      const mockConnection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleEmail: 'test@example.com',
        isActive: true,
        updatedAt: new Date()
      };

      storage.getGoogleCalendarConnection = jest.fn().mockResolvedValue(mockConnection);

      const mockTokenStatus = {
        needsRefresh: false,
        expiresIn: 300, // 5 minutes
        warning: true
      };

      const response = await request(app)
        .get('/api/calendar/health')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health.warning).toBe(true);
      expect(response.body.health.expiresIn).toBe(300);
    });

    it('should return unhealthy status for disconnected calendar', async () => {
      storage.getGoogleCalendarConnection = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/calendar/health')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        health: {
          connected: false,
          tokenValid: false,
          error: expect.any(String)
        }
      });
    });
  });

  describe('API Rate Limiting and Security', () => {
    it('should enforce rate limits on calendar API endpoints', async () => {
      // Mock multiple rapid requests
      const promises = Array.from({ length: 60 }, () =>
        request(app)
          .post('/api/webhooks/calendar/create-event')
          .send({
            userId: 'test-user-id',
            agentId: 'test-agent-id',
            eventData: {
              summary: 'Rate limit test',
              start: { dateTime: '2025-01-01T10:00:00Z' },
              end: { dateTime: '2025-01-01T11:00:00Z' }
            }
          })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should sanitize input parameters', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '"; DROP TABLE users; --',
        '../../../etc/passwd'
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/webhooks/calendar/create-event')
          .send({
            userId: maliciousInput,
            agentId: 'test-agent-id',
            eventData: {
              summary: maliciousInput,
              start: { dateTime: '2025-01-01T10:00:00Z' },
              end: { dateTime: '2025-01-01T11:00:00Z' }
            }
          });

        // Should either reject or sanitize
        expect([400, 200]).toContain(response.status);
        
        if (response.status === 200) {
          // If accepted, input should be sanitized
          expect(response.body.event?.summary).not.toContain('<script>');
          expect(response.body.event?.summary).not.toContain('javascript:');
        }
      }
    });

    it('should validate authentication tokens', async () => {
      const response = await request(app)
        .get('/api/calendar/status')
        .set('Authorization', 'Bearer invalid-token')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token'
      });
    });
  });
});