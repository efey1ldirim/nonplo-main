import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../server/services/CalendarService');
jest.mock('../../server/storage');
jest.mock('../../server/utils/encryption');
jest.mock('googleapis');

describe('Error Scenarios and Edge Cases', () => {
  let calendarService: any;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    const { CalendarService } = await import('../../server/services/CalendarService');
    calendarService = new CalendarService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Google API Errors', () => {
    it('should handle 401 Unauthorized errors', async () => {
      const mockCalendar = {
        events: {
          insert: jest.fn().mockRejectedValue({
            code: 401,
            message: 'Unauthorized',
            response: { status: 401 }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'expired-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      await expect(
        calendarService.createEvent('test-user', 'test-agent', {
          summary: 'Test Event',
          start: { dateTime: '2025-01-01T10:00:00Z' },
          end: { dateTime: '2025-01-01T11:00:00Z' }
        })
      ).rejects.toThrow('Unauthorized');
    });

    it('should handle 403 Forbidden errors (insufficient permissions)', async () => {
      const mockCalendar = {
        events: {
          insert: jest.fn().mockRejectedValue({
            code: 403,
            message: 'Insufficient Permission',
            response: { status: 403 }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      await expect(
        calendarService.createEvent('test-user', 'test-agent', {
          summary: 'Test Event',
          start: { dateTime: '2025-01-01T10:00:00Z' },
          end: { dateTime: '2025-01-01T11:00:00Z' }
        })
      ).rejects.toThrow('Insufficient Permission');
    });

    it('should handle 429 Rate Limit Exceeded errors', async () => {
      const mockCalendar = {
        freebusy: {
          query: jest.fn().mockRejectedValue({
            code: 429,
            message: 'Rate Limit Exceeded',
            response: { 
              status: 429,
              headers: { 'retry-after': '60' }
            }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      await expect(
        calendarService.checkAvailability(
          'test-user',
          'test-agent',
          '2025-01-01T10:00:00Z',
          '2025-01-01T18:00:00Z'
        )
      ).rejects.toThrow('Rate Limit Exceeded');
    });

    it('should handle 500 Internal Server Error from Google', async () => {
      const mockCalendar = {
        events: {
          insert: jest.fn().mockRejectedValue({
            code: 500,
            message: 'Internal Server Error',
            response: { status: 500 }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      await expect(
        calendarService.createEvent('test-user', 'test-agent', {
          summary: 'Test Event',
          start: { dateTime: '2025-01-01T10:00:00Z' },
          end: { dateTime: '2025-01-01T11:00:00Z' }
        })
      ).rejects.toThrow('Internal Server Error');
    });

    it('should handle network timeout errors', async () => {
      const mockCalendar = {
        events: {
          insert: jest.fn().mockRejectedValue({
            code: 'ETIMEDOUT',
            message: 'Request timeout'
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      await expect(
        calendarService.createEvent('test-user', 'test-agent', {
          summary: 'Test Event',
          start: { dateTime: '2025-01-01T10:00:00Z' },
          end: { dateTime: '2025-01-01T11:00:00Z' }
        })
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('Token Management Errors', () => {
    it('should handle corrupted access tokens', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'corrupted-encrypted-token',
        googleRefreshToken: 'valid-refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockImplementation((token) => {
        if (token === 'corrupted-encrypted-token') {
          throw new Error('Decryption failed');
        }
        return 'decrypted-token';
      });

      await expect(
        calendarService.createEvent('test-user', 'test-agent', {
          summary: 'Test Event',
          start: { dateTime: '2025-01-01T10:00:00Z' },
          end: { dateTime: '2025-01-01T11:00:00Z' }
        })
      ).rejects.toThrow('Decryption failed');
    });

    it('should handle expired refresh tokens', async () => {
      const mockOAuth = {
        getToken: jest.fn().mockRejectedValue({
          code: 400,
          message: 'invalid_grant'
        }),
        refreshAccessToken: jest.fn().mockRejectedValue({
          code: 400,
          message: 'invalid_grant: Token has been expired or revoked'
        })
      };

      calendarService['oauth2Client'] = mockOAuth;

      await expect(
        calendarService.refreshTokens('test-user', 'test-agent')
      ).rejects.toThrow('invalid_grant');
    });

    it('should handle missing refresh token', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: null // Missing refresh token
      });

      await expect(
        calendarService.refreshTokens('test-user', 'test-agent')
      ).rejects.toThrow('Refresh token not found');
    });
  });

  describe('Database Error Scenarios', () => {
    it('should handle database connection failures', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        calendarService.checkAvailability(
          'test-user',
          'test-agent',
          '2025-01-01T10:00:00Z',
          '2025-01-01T18:00:00Z'
        )
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle constraint violations', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.createGoogleCalendarConnection.mockRejectedValue(
        new Error('Unique constraint violation: user_id, agent_id')
      );

      await expect(
        calendarService.handleCallback('test-code', 'valid-state')
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should handle foreign key violations', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.logCalendarOperation.mockRejectedValue(
        new Error('Foreign key constraint violation: agent_id does not exist')
      );

      // This should not prevent the actual calendar operation
      const mockCalendar = {
        events: {
          insert: jest.fn().mockResolvedValue({
            data: { id: 'event-123' }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      // Operation should still succeed even if logging fails
      const result = await calendarService.createEvent('test-user', 'invalid-agent', {
        summary: 'Test Event',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Input Validation Errors', () => {
    it('should handle invalid datetime formats', async () => {
      await expect(
        calendarService.createEvent('test-user', 'test-agent', {
          summary: 'Test Event',
          start: { dateTime: 'invalid-datetime' },
          end: { dateTime: '2025-01-01T11:00:00Z' }
        })
      ).rejects.toThrow('Invalid datetime format');
    });

    it('should handle end time before start time', async () => {
      await expect(
        calendarService.createEvent('test-user', 'test-agent', {
          summary: 'Test Event',
          start: { dateTime: '2025-01-01T11:00:00Z' },
          end: { dateTime: '2025-01-01T10:00:00Z' } // End before start
        })
      ).rejects.toThrow('End time must be after start time');
    });

    it('should handle extremely long event titles', async () => {
      const longTitle = 'A'.repeat(1000); // 1000 character title
      
      await expect(
        calendarService.createEvent('test-user', 'test-agent', {
          summary: longTitle,
          start: { dateTime: '2025-01-01T10:00:00Z' },
          end: { dateTime: '2025-01-01T11:00:00Z' }
        })
      ).rejects.toThrow('Event title too long');
    });

    it('should handle invalid timezone specifications', async () => {
      await expect(
        calendarService.checkAvailability(
          'test-user',
          'test-agent',
          '2025-01-01T10:00:00',
          '2025-01-01T18:00:00',
          'Invalid/Timezone'
        )
      ).rejects.toThrow('Invalid timezone');
    });

    it('should handle malformed state parameters', async () => {
      await expect(
        calendarService.handleCallback('test-code', 'malformed-state')
      ).rejects.toThrow('Invalid state parameter');
    });
  });

  describe('Edge Cases', () => {
    it('should handle events at year boundaries', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      const mockCalendar = {
        events: {
          insert: jest.fn().mockResolvedValue({
            data: { id: 'new-year-event' }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const result = await calendarService.createEvent('test-user', 'test-agent', {
        summary: 'New Year Event',
        start: { dateTime: '2024-12-31T23:30:00Z' },
        end: { dateTime: '2025-01-01T00:30:00Z' }
      });

      expect(result.success).toBe(true);
      expect(result.event.id).toBe('new-year-event');
    });

    it('should handle leap year edge cases', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      const mockCalendar = {
        freebusy: {
          query: jest.fn().mockResolvedValue({
            data: { calendars: { primary: { busy: [] } } }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const result = await calendarService.checkAvailability(
        'test-user',
        'test-agent',
        '2024-02-29T10:00:00Z', // Leap year date
        '2024-02-29T18:00:00Z'
      );

      expect(result.available).toBe(true);
    });

    it('should handle concurrent calendar operations', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      let callCount = 0;
      const mockCalendar = {
        events: {
          insert: jest.fn().mockImplementation(() => {
            callCount++;
            return Promise.resolve({
              data: { id: `event-${callCount}` }
            });
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      // Create multiple concurrent events
      const promises = Array.from({ length: 5 }, (_, i) =>
        calendarService.createEvent('test-user', 'test-agent', {
          summary: `Concurrent Event ${i + 1}`,
          start: { dateTime: `2025-01-01T${10 + i}:00:00Z` },
          end: { dateTime: `2025-01-01T${11 + i}:00:00Z` }
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.event.id).toBe(`event-${i + 1}`);
      });
    });

    it('should handle very large time ranges for availability check', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      const mockCalendar = {
        freebusy: {
          query: jest.fn().mockResolvedValue({
            data: { calendars: { primary: { busy: [] } } }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      // Check availability for entire year
      const result = await calendarService.checkAvailability(
        'test-user',
        'test-agent',
        '2025-01-01T00:00:00Z',
        '2025-12-31T23:59:59Z'
      );

      expect(result.available).toBe(true);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle processing large numbers of busy periods', async () => {
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: 'valid-token',
        googleRefreshToken: 'refresh-token'
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-token');

      // Generate 1000 busy periods
      const busyPeriods = Array.from({ length: 1000 }, (_, i) => ({
        start: `2025-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
        end: `2025-01-01T${String(i % 24).padStart(2, '0')}:30:00Z`
      }));

      const mockCalendar = {
        freebusy: {
          query: jest.fn().mockResolvedValue({
            data: { calendars: { primary: { busy: busyPeriods } } }
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar.mockReturnValue(mockCalendar);

      const result = await calendarService.checkAvailability(
        'test-user',
        'test-agent',
        '2025-01-01T00:00:00Z',
        '2025-01-31T23:59:59Z'
      );

      expect(result.available).toBe(false);
      expect(result.busyTimes).toHaveLength(1000);
    });

    it('should handle memory pressure during token operations', async () => {
      // Simulate memory pressure by creating large token strings
      const largeToken = 'x'.repeat(100000); // 100KB token
      
      const mockStorage = require('../../server/storage').storage;
      mockStorage.getGoogleCalendarByUserAgent.mockResolvedValue({
        googleAccessToken: largeToken,
        googleRefreshToken: largeToken
      });

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt.mockReturnValue('decrypted-large-token');

      // Should handle large tokens without memory issues
      const result = await calendarService.getConnectionStatus('test-user', 'test-agent');
      expect(result).toBeDefined();
    });
  });
});