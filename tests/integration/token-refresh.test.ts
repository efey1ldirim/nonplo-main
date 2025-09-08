import { describe, it, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';

// Mock dependencies
jest.mock('../../server/storage');
jest.mock('../../server/services/CalendarService');
jest.mock('googleapis');

describe('Token Refresh Integration Tests', () => {
  let calendarService: any;
  let storage: any;

  beforeAll(async () => {
    // Mock modules
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

  describe('Automatic Token Refresh', () => {
    it('should automatically refresh expired access tokens', async () => {
      // Mock expired connection
      const expiredConnection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleEmail: 'test@example.com',
        googleAccessToken: 'encrypted-expired-token',
        googleRefreshToken: 'encrypted-refresh-token',
        isActive: true
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(expiredConnection);

      // Mock encryption/decryption
      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockReturnValueOnce('expired-access-token')
        .mockReturnValueOnce('valid-refresh-token');
      mockEncryption.encrypt = jest.fn()
        .mockReturnValueOnce('encrypted-new-access-token')
        .mockReturnValueOnce('encrypted-new-refresh-token');

      // Mock Google OAuth response
      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: Date.now() + 3600000
      };

      const mockOAuth = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: newTokens
        })
      };

      const calendarServiceInstance = new calendarService();
      calendarServiceInstance['oauth2Client'] = mockOAuth;

      // Mock storage update
      storage.updateGoogleCalendarTokens = jest.fn().mockResolvedValue({
        ...expiredConnection,
        googleAccessToken: 'encrypted-new-access-token',
        googleRefreshToken: 'encrypted-new-refresh-token',
        updatedAt: new Date()
      });

      // Execute token refresh
      const result = await calendarServiceInstance.refreshTokens('test-user-id', 'test-agent-id');

      expect(result.success).toBe(true);
      expect(result.newTokens).toBeDefined();
      
      expect(mockOAuth.setCredentials).toHaveBeenCalledWith({
        refresh_token: 'valid-refresh-token'
      });
      
      expect(mockOAuth.refreshAccessToken).toHaveBeenCalled();
      
      expect(storage.updateGoogleCalendarTokens).toHaveBeenCalledWith(
        'test-user-id',
        'test-agent-id',
        'encrypted-new-access-token',
        'encrypted-new-refresh-token'
      );
    });

    it('should handle refresh token expiry', async () => {
      const expiredConnection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-expired-token',
        googleRefreshToken: 'encrypted-expired-refresh-token',
        isActive: true
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(expiredConnection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockReturnValueOnce('expired-access-token')
        .mockReturnValueOnce('expired-refresh-token');

      const mockOAuth = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockRejectedValue({
          code: 400,
          message: 'invalid_grant'
        })
      };

      const calendarServiceInstance = new calendarService();
      calendarServiceInstance['oauth2Client'] = mockOAuth;

      // Should mark connection as inactive
      storage.updateGoogleCalendarConnection = jest.fn().mockResolvedValue(true);

      await expect(
        calendarServiceInstance.refreshTokens('test-user-id', 'test-agent-id')
      ).rejects.toThrow('Refresh token expired');

      expect(storage.updateGoogleCalendarConnection).toHaveBeenCalledWith(
        'test-user-id',
        'test-agent-id',
        { isActive: false }
      );
    });

    it('should handle network errors during token refresh', async () => {
      const connection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-token',
        googleRefreshToken: 'encrypted-refresh-token',
        isActive: true
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(connection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const mockOAuth = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockRejectedValue({
          code: 'ETIMEDOUT',
          message: 'Network timeout'
        })
      };

      const calendarServiceInstance = new calendarService();
      calendarServiceInstance['oauth2Client'] = mockOAuth;

      await expect(
        calendarServiceInstance.refreshTokens('test-user-id', 'test-agent-id')
      ).rejects.toThrow('Network timeout');

      // Connection should remain active for network errors
      expect(storage.updateGoogleCalendarConnection).not.toHaveBeenCalled();
    });
  });

  describe('Token Refresh During API Operations', () => {
    it('should refresh token and retry when creating event with expired token', async () => {
      const connection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-expired-token',
        googleRefreshToken: 'encrypted-refresh-token',
        isActive: true
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(connection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockReturnValueOnce('expired-access-token')
        .mockReturnValueOnce('refresh-token')
        .mockReturnValueOnce('new-access-token'); // After refresh

      mockEncryption.encrypt = jest.fn()
        .mockReturnValueOnce('encrypted-new-access-token')
        .mockReturnValueOnce('encrypted-new-refresh-token');

      // Mock calendar API - first call fails with 401, second succeeds
      const mockCalendar = {
        events: {
          insert: jest.fn()
            .mockRejectedValueOnce({
              code: 401,
              message: 'Unauthorized'
            })
            .mockResolvedValueOnce({
              data: {
                id: 'event-123',
                summary: 'Test Event'
              }
            })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar = jest.fn().mockReturnValue(mockCalendar);

      // Mock OAuth refresh
      const mockOAuth = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token'
          }
        })
      };

      const calendarServiceInstance = new calendarService();
      calendarServiceInstance['oauth2Client'] = mockOAuth;

      storage.updateGoogleCalendarTokens = jest.fn().mockResolvedValue(connection);

      const eventData = {
        summary: 'Test Event',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      const result = await calendarServiceInstance.createEvent(
        'test-user-id',
        'test-agent-id',
        eventData
      );

      expect(result.success).toBe(true);
      expect(result.event.id).toBe('event-123');

      // Should have attempted refresh and retry
      expect(mockOAuth.refreshAccessToken).toHaveBeenCalled();
      expect(storage.updateGoogleCalendarTokens).toHaveBeenCalled();
      expect(mockCalendar.events.insert).toHaveBeenCalledTimes(2);
    });

    it('should handle token refresh failure during API operation', async () => {
      const connection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-expired-token',
        googleRefreshToken: 'encrypted-expired-refresh-token',
        isActive: true
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(connection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockReturnValueOnce('expired-access-token')
        .mockReturnValueOnce('expired-refresh-token');

      // Mock calendar API failure
      const mockCalendar = {
        events: {
          insert: jest.fn().mockRejectedValue({
            code: 401,
            message: 'Unauthorized'
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar = jest.fn().mockReturnValue(mockCalendar);

      // Mock OAuth refresh failure
      const mockOAuth = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockRejectedValue({
          code: 400,
          message: 'invalid_grant'
        })
      };

      const calendarServiceInstance = new calendarService();
      calendarServiceInstance['oauth2Client'] = mockOAuth;

      storage.updateGoogleCalendarConnection = jest.fn().mockResolvedValue(true);

      const eventData = {
        summary: 'Test Event',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      await expect(
        calendarServiceInstance.createEvent('test-user-id', 'test-agent-id', eventData)
      ).rejects.toThrow('Authentication failed');

      // Connection should be deactivated
      expect(storage.updateGoogleCalendarConnection).toHaveBeenCalledWith(
        'test-user-id',
        'test-agent-id',
        { isActive: false }
      );
    });
  });

  describe('Token Expiry Monitoring', () => {
    it('should detect tokens nearing expiry', async () => {
      const connection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-token',
        googleRefreshToken: 'encrypted-refresh-token',
        isActive: true,
        updatedAt: new Date(Date.now() - 3000000) // 50 minutes ago (token expires in 60 min)
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(connection);

      const { checkTokenExpiry } = await import('../../server/middleware/calendarMonitoring');
      
      const tokenStatus = await checkTokenExpiry('test-user-id', 'test-agent-id');

      expect(tokenStatus.needsRefresh).toBe(false);
      expect(tokenStatus.warning).toBe(true);
      expect(tokenStatus.expiresIn).toBeLessThan(600); // Less than 10 minutes
    });

    it('should detect expired tokens', async () => {
      const connection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-token',
        googleRefreshToken: 'encrypted-refresh-token',
        isActive: true,
        updatedAt: new Date(Date.now() - 4000000) // 66 minutes ago (token expired)
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(connection);

      const { checkTokenExpiry } = await import('../../server/middleware/calendarMonitoring');
      
      const tokenStatus = await checkTokenExpiry('test-user-id', 'test-agent-id');

      expect(tokenStatus.needsRefresh).toBe(true);
      expect(tokenStatus.warning).toBe(true);
      expect(tokenStatus.expiresIn).toBeLessThan(0);
    });

    it('should handle missing connection in expiry check', async () => {
      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(null);

      const { checkTokenExpiry } = await import('../../server/middleware/calendarMonitoring');
      
      const tokenStatus = await checkTokenExpiry('test-user-id', 'non-existent-agent');

      expect(tokenStatus.needsRefresh).toBe(true);
      expect(tokenStatus.warning).toBe(true);
      expect(tokenStatus.reason).toBe('Connection not found');
    });
  });

  describe('Proactive Token Refresh', () => {
    it('should proactively refresh tokens nearing expiry', async () => {
      const nearExpiryConnection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-token',
        googleRefreshToken: 'encrypted-refresh-token',
        isActive: true,
        updatedAt: new Date(Date.now() - 3300000) // 55 minutes ago
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(nearExpiryConnection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockReturnValueOnce('current-access-token')
        .mockReturnValueOnce('refresh-token');
      
      mockEncryption.encrypt = jest.fn()
        .mockReturnValueOnce('encrypted-new-access-token')
        .mockReturnValueOnce('encrypted-new-refresh-token');

      const mockOAuth = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expiry_date: Date.now() + 3600000
          }
        })
      };

      const calendarServiceInstance = new calendarService();
      calendarServiceInstance['oauth2Client'] = mockOAuth;

      storage.updateGoogleCalendarTokens = jest.fn().mockResolvedValue({
        ...nearExpiryConnection,
        googleAccessToken: 'encrypted-new-access-token',
        googleRefreshToken: 'encrypted-new-refresh-token',
        updatedAt: new Date()
      });

      // Proactive refresh should be triggered
      const result = await calendarServiceInstance.refreshTokensIfNeeded('test-user-id', 'test-agent-id');

      expect(result.refreshed).toBe(true);
      expect(result.reason).toBe('Token nearing expiry');
      expect(mockOAuth.refreshAccessToken).toHaveBeenCalled();
      expect(storage.updateGoogleCalendarTokens).toHaveBeenCalled();
    });

    it('should skip refresh for recently updated tokens', async () => {
      const recentConnection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-token',
        googleRefreshToken: 'encrypted-refresh-token',
        isActive: true,
        updatedAt: new Date(Date.now() - 600000) // 10 minutes ago
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(recentConnection);

      const calendarServiceInstance = new calendarService();

      const result = await calendarServiceInstance.refreshTokensIfNeeded('test-user-id', 'test-agent-id');

      expect(result.refreshed).toBe(false);
      expect(result.reason).toBe('Token still valid');
    });
  });

  describe('Concurrent Token Refresh Protection', () => {
    it('should prevent concurrent token refresh for same connection', async () => {
      const connection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-expired-token',
        googleRefreshToken: 'encrypted-refresh-token',
        isActive: true
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(connection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockReturnValue('refresh-token');
      
      mockEncryption.encrypt = jest.fn()
        .mockReturnValue('encrypted-new-token');

      let refreshCount = 0;
      const mockOAuth = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockImplementation(async () => {
          refreshCount++;
          // Simulate delay
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            credentials: {
              access_token: `new-access-token-${refreshCount}`,
              refresh_token: 'new-refresh-token'
            }
          };
        })
      };

      const calendarServiceInstance = new calendarService();
      calendarServiceInstance['oauth2Client'] = mockOAuth;

      storage.updateGoogleCalendarTokens = jest.fn().mockResolvedValue(connection);

      // Start multiple concurrent refresh operations
      const promises = Array.from({ length: 5 }, () =>
        calendarServiceInstance.refreshTokens('test-user-id', 'test-agent-id')
      );

      const results = await Promise.allSettled(promises);

      // Only one refresh should have occurred
      expect(refreshCount).toBe(1);
      
      // All promises should resolve (some may be served from cache)
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBe(5);
    });

    it('should handle concurrent API calls during token refresh', async () => {
      const connection = {
        id: 'connection-123',
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        googleAccessToken: 'encrypted-expired-token',
        googleRefreshToken: 'encrypted-refresh-token',
        isActive: true
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(connection);

      const mockEncryption = require('../../server/utils/encryption');
      mockEncryption.decrypt = jest.fn()
        .mockReturnValue('expired-token')
        .mockReturnValue('refresh-token')
        .mockReturnValue('new-access-token');

      mockEncryption.encrypt = jest.fn()
        .mockReturnValue('encrypted-new-token');

      let apiCallCount = 0;
      const mockCalendar = {
        events: {
          insert: jest.fn().mockImplementation(async () => {
            apiCallCount++;
            if (apiCallCount <= 3) {
              throw { code: 401, message: 'Unauthorized' };
            }
            return {
              data: { id: `event-${apiCallCount}` }
            };
          })
        }
      };

      const mockGoogle = require('googleapis').google;
      mockGoogle.calendar = jest.fn().mockReturnValue(mockCalendar);

      const mockOAuth = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token'
          }
        })
      };

      const calendarServiceInstance = new calendarService();
      calendarServiceInstance['oauth2Client'] = mockOAuth;

      storage.updateGoogleCalendarTokens = jest.fn().mockResolvedValue(connection);

      // Start multiple concurrent event creation calls
      const eventData = {
        summary: 'Concurrent Test Event',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' }
      };

      const promises = Array.from({ length: 3 }, (_, i) =>
        calendarServiceInstance.createEvent('test-user-id', 'test-agent-id', {
          ...eventData,
          summary: `Event ${i + 1}`
        })
      );

      const results = await Promise.allSettled(promises);

      // All should eventually succeed after token refresh
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBe(3);

      // Token refresh should happen only once
      expect(mockOAuth.refreshAccessToken).toHaveBeenCalledTimes(1);
    });
  });
});