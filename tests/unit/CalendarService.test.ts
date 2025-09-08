import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { CalendarService } from '../../server/services/CalendarService';

// Mock dependencies
jest.mock('../../server/storage');
jest.mock('../../server/utils/encryption');
jest.mock('googleapis');

describe('CalendarService', () => {
  let calendarService: CalendarService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    calendarService = new CalendarService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize OAuth2 client with valid credentials', () => {
      expect(calendarService).toBeDefined();
      // OAuth client should be initialized with test credentials
    });

    it('should handle missing credentials gracefully', () => {
      // Temporarily remove env vars
      const originalClientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
      delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
      
      const service = new CalendarService();
      expect(service).toBeDefined();
      
      // Restore env var
      process.env.GOOGLE_CALENDAR_CLIENT_ID = originalClientId;
    });
  });

  describe('generateAuthUrl', () => {
    it('should generate valid OAuth URL with correct parameters', () => {
      const userId = 'test-user-id';
      const agentId = 'test-agent-id';
      
      const authUrl = calendarService.generateAuthUrl(userId, agentId);
      
      expect(authUrl).toContain('oauth2.googleapis.com');
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain('state=');
      expect(authUrl).toContain('access_type=offline');
      expect(authUrl).toContain('prompt=consent');
    });

    it('should throw error when OAuth client not configured', () => {
      const service = new CalendarService();
      service['oauth2Client'] = null;
      
      expect(() => {
        service.generateAuthUrl('user-id', 'agent-id');
      }).toThrow('Google Calendar not configured');
    });

    it('should encode user and agent IDs in state parameter', () => {
      const userId = 'test-user-id';
      const agentId = 'test-agent-id';
      
      const authUrl = calendarService.generateAuthUrl(userId, agentId);
      const urlParams = new URLSearchParams(authUrl.split('?')[1]);
      const state = urlParams.get('state');
      
      expect(state).toBeTruthy();
      
      const decoded = JSON.parse(Buffer.from(state!, 'base64').toString());
      expect(decoded.userId).toBe(userId);
      expect(decoded.agentId).toBe(agentId);
    });
  });

  describe('handleCallback', () => {
    it('should process OAuth callback successfully', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000
      };

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue(null);
      mockStorage.createGoogleCalendarConnection.mockResolvedValue(true);

      const mockOAuth = {
        getToken: jest.fn().mockResolvedValue({ tokens: mockTokens }),
        setCredentials: jest.fn(),
        request: jest.fn().mockResolvedValue({
          data: {
            email: 'test@example.com'
          }
        })
      };

      calendarService['oauth2Client'] = mockOAuth;

      const state = Buffer.from(JSON.stringify({
        userId: 'test-user',
        agentId: 'test-agent'
      })).toString('base64');

      const result = await calendarService.handleCallback('test-code', state);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user');
      expect(result.agentId).toBe('test-agent');
      expect(mockOAuth.getToken).toHaveBeenCalledWith('test-code');
    });

    it('should handle existing connection', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        id: 'existing-connection'
      });

      const state = Buffer.from(JSON.stringify({
        userId: 'test-user',
        agentId: 'test-agent'
      })).toString('base64');

      const result = await calendarService.handleCallback('test-code', state);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user');
      expect(result.agentId).toBe('test-agent');
    });

    it('should handle invalid state parameter', async () => {
      await expect(
        calendarService.handleCallback('test-code', 'invalid-state')
      ).rejects.toThrow();
    });

    it('should handle token exchange failure', async () => {
      const mockOAuth = {
        getToken: jest.fn().mockRejectedValue(new Error('Token exchange failed'))
      };

      calendarService['oauth2Client'] = mockOAuth;

      const state = Buffer.from(JSON.stringify({
        userId: 'test-user',
        agentId: 'test-agent'
      })).toString('base64');

      await expect(
        calendarService.handleCallback('test-code', state)
      ).rejects.toThrow('Token exchange failed');
    });
  });

  describe('createEvent', () => {
    it('should create calendar event successfully', async () => {
      const mockConnection = {
        googleAccessToken: 'encrypted-access-token',
        googleRefreshToken: 'encrypted-refresh-token'
      };

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue(mockConnection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      const mockCalendar = {
        events: {
          insert: jest.fn().mockResolvedValue({
            data: {
              id: 'event-123',
              htmlLink: 'https://calendar.google.com/event/123',
              start: { dateTime: '2025-01-01T10:00:00Z' },
              end: { dateTime: '2025-01-01T11:00:00Z' }
            }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const eventData = {
        summary: 'Test Event',
        description: 'Test Description',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      const result = await calendarService.createEvent(
        'test-user',
        'test-agent',
        eventData
      );

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event.id).toBe('event-123');
      expect(mockCalendar.events.insert).toHaveBeenCalled();
    });

    it('should handle calendar connection not found', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue(null);

      const eventData = {
        summary: 'Test Event',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      await expect(
        calendarService.createEvent('test-user', 'test-agent', eventData)
      ).rejects.toThrow('Calendar connection not found');
    });

    it('should handle API errors gracefully', async () => {
      const mockConnection = {
        googleAccessToken: 'encrypted-access-token',
        googleRefreshToken: 'encrypted-refresh-token'
      };

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue(mockConnection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      const mockCalendar = {
        events: {
          insert: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const eventData = {
        summary: 'Test Event',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      await expect(
        calendarService.createEvent('test-user', 'test-agent', eventData)
      ).rejects.toThrow('API Error');
    });
  });

  describe('checkAvailability', () => {
    it('should check calendar availability successfully', async () => {
      const mockConnection = {
        googleAccessToken: 'encrypted-access-token',
        googleRefreshToken: 'encrypted-refresh-token'
      };

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue(mockConnection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      const mockCalendar = {
        freebusy: {
          query: jest.fn().mockResolvedValue({
            data: {
              calendars: {
                'primary': {
                  busy: []
                }
              }
            }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const result = await calendarService.checkAvailability(
        'test-user',
        'test-agent',
        '2025-01-01T10:00:00Z',
        '2025-01-01T18:00:00Z'
      );

      expect(result.available).toBe(true);
      expect(result.busyTimes).toEqual([]);
      expect(mockCalendar.freebusy.query).toHaveBeenCalled();
    });

    it('should return busy times when calendar has events', async () => {
      const mockConnection = {
        googleAccessToken: 'encrypted-access-token',
        googleRefreshToken: 'encrypted-refresh-token'
      };

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue(mockConnection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      const busyTimes = [
        {
          start: '2025-01-01T10:00:00Z',
          end: '2025-01-01T11:00:00Z'
        }
      ];

      const mockCalendar = {
        freebusy: {
          query: jest.fn().mockResolvedValue({
            data: {
              calendars: {
                'primary': {
                  busy: busyTimes
                }
              }
            }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const result = await calendarService.checkAvailability(
        'test-user',
        'test-agent',
        '2025-01-01T09:00:00Z',
        '2025-01-01T18:00:00Z'
      );

      expect(result.available).toBe(false);
      expect(result.busyTimes).toEqual(busyTimes);
    });
  });

  describe('disconnectCalendar', () => {
    it('should disconnect calendar successfully', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.deleteGoogleCalendarConnection.mockResolvedValue(true);

      const result = await calendarService.disconnectCalendar('test-user', 'test-agent');

      expect(result.success).toBe(true);
      expect(mockStorage.deleteGoogleCalendarConnection).toHaveBeenCalledWith('test-user', 'test-agent');
    });

    it('should handle disconnection errors', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.deleteGoogleCalendarConnection.mockRejectedValue(new Error('Delete failed'));

      await expect(
        calendarService.disconnectCalendar('test-user', 'test-agent')
      ).rejects.toThrow('Delete failed');
    });
  });
});