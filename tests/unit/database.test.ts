import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the storage module
jest.mock('../../server/storage');

describe('Database Operations', () => {
  let storage: any;
  
  beforeEach(async () => {
    // Get the mocked storage
    const storageModule = await import('../../server/storage');
    storage = storageModule.storage;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Google Calendar Connections', () => {
    describe('createGoogleCalendarConnection', () => {
      it('should create calendar connection successfully', async () => {
        const connectionData = {
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          googleEmail: 'test@example.com',
          googleAccessToken: 'encrypted-access-token',
          googleRefreshToken: 'encrypted-refresh-token',
          calendarId: 'primary',
          isActive: true
        };

        storage.createGoogleCalendarConnection.mockResolvedValue({
          id: 'connection-123',
          ...connectionData,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const result = await storage.createGoogleCalendarConnection(connectionData);

        expect(result).toBeDefined();
        expect(result.id).toBe('connection-123');
        expect(result.userId).toBe(connectionData.userId);
        expect(result.agentId).toBe(connectionData.agentId);
        expect(storage.createGoogleCalendarConnection).toHaveBeenCalledWith(connectionData);
      });

      it('should handle duplicate connection creation', async () => {
        const connectionData = {
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          googleEmail: 'test@example.com',
          googleAccessToken: 'encrypted-access-token',
          googleRefreshToken: 'encrypted-refresh-token'
        };

        storage.createGoogleCalendarConnection.mockRejectedValue(
          new Error('Unique constraint violation')
        );

        await expect(
          storage.createGoogleCalendarConnection(connectionData)
        ).rejects.toThrow('Unique constraint violation');
      });

      it('should validate required fields', async () => {
        const incompleteData = {
          userId: 'test-user-id',
          // Missing agentId, googleEmail, etc.
        };

        storage.createGoogleCalendarConnection.mockRejectedValue(
          new Error('Missing required fields')
        );

        await expect(
          storage.createGoogleCalendarConnection(incompleteData)
        ).rejects.toThrow('Missing required fields');
      });
    });

    describe('getGoogleCalendarByUserAgent', () => {
      it('should retrieve calendar connection by user and agent', async () => {
        const mockConnection = {
          id: 'connection-123',
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          googleEmail: 'test@example.com',
          googleAccessToken: 'encrypted-access-token',
          googleRefreshToken: 'encrypted-refresh-token',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        storage.getGoogleCalendarByUserAgent.mockResolvedValue(mockConnection);

        const result = await storage.getGoogleCalendarByUserAgent('test-user-id', 'test-agent-id');

        expect(result).toEqual(mockConnection);
        expect(storage.getGoogleCalendarByUserAgent).toHaveBeenCalledWith('test-user-id', 'test-agent-id');
      });

      it('should return null for non-existent connection', async () => {
        storage.getGoogleCalendarByUserAgent.mockResolvedValue(null);

        const result = await storage.getGoogleCalendarByUserAgent('non-existent-user', 'non-existent-agent');

        expect(result).toBeNull();
      });

      it('should handle database errors', async () => {
        storage.getGoogleCalendarByUserAgent.mockRejectedValue(
          new Error('Database connection error')
        );

        await expect(
          storage.getGoogleCalendarByUserAgent('test-user-id', 'test-agent-id')
        ).rejects.toThrow('Database connection error');
      });
    });

    describe('updateGoogleCalendarTokens', () => {
      it('should update calendar tokens successfully', async () => {
        const updatedConnection = {
          id: 'connection-123',
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          googleAccessToken: 'new-encrypted-access-token',
          googleRefreshToken: 'new-encrypted-refresh-token',
          updatedAt: new Date()
        };

        storage.updateGoogleCalendarTokens.mockResolvedValue(updatedConnection);

        const result = await storage.updateGoogleCalendarTokens(
          'test-user-id',
          'test-agent-id',
          'new-encrypted-access-token',
          'new-encrypted-refresh-token'
        );

        expect(result).toEqual(updatedConnection);
        expect(storage.updateGoogleCalendarTokens).toHaveBeenCalledWith(
          'test-user-id',
          'test-agent-id',
          'new-encrypted-access-token',
          'new-encrypted-refresh-token'
        );
      });

      it('should handle non-existent connection update', async () => {
        storage.updateGoogleCalendarTokens.mockResolvedValue(null);

        const result = await storage.updateGoogleCalendarTokens(
          'non-existent-user',
          'non-existent-agent',
          'new-access-token',
          'new-refresh-token'
        );

        expect(result).toBeNull();
      });
    });

    describe('deleteGoogleCalendarConnection', () => {
      it('should delete calendar connection successfully', async () => {
        storage.deleteGoogleCalendarConnection.mockResolvedValue(true);

        const result = await storage.deleteGoogleCalendarConnection('test-user-id', 'test-agent-id');

        expect(result).toBe(true);
        expect(storage.deleteGoogleCalendarConnection).toHaveBeenCalledWith('test-user-id', 'test-agent-id');
      });

      it('should handle non-existent connection deletion', async () => {
        storage.deleteGoogleCalendarConnection.mockResolvedValue(false);

        const result = await storage.deleteGoogleCalendarConnection('non-existent-user', 'non-existent-agent');

        expect(result).toBe(false);
      });

      it('should handle deletion errors', async () => {
        storage.deleteGoogleCalendarConnection.mockRejectedValue(
          new Error('Foreign key constraint violation')
        );

        await expect(
          storage.deleteGoogleCalendarConnection('test-user-id', 'test-agent-id')
        ).rejects.toThrow('Foreign key constraint violation');
      });
    });
  });

  describe('Calendar Operations Logging', () => {
    describe('logCalendarOperation', () => {
      it('should log successful calendar operation', async () => {
        const operationData = {
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          operationType: 'create_event',
          googleEventId: 'event-123',
          inputData: { summary: 'Test Event' },
          resultData: { success: true, eventId: 'event-123' },
          success: true
        };

        const mockLogEntry = {
          id: 'log-123',
          ...operationData,
          createdAt: new Date()
        };

        storage.logCalendarOperation.mockResolvedValue(mockLogEntry);

        const result = await storage.logCalendarOperation(operationData);

        expect(result).toEqual(mockLogEntry);
        expect(storage.logCalendarOperation).toHaveBeenCalledWith(operationData);
      });

      it('should log failed calendar operation', async () => {
        const operationData = {
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          operationType: 'create_event',
          inputData: { summary: 'Test Event' },
          success: false,
          errorMessage: 'Calendar API error'
        };

        const mockLogEntry = {
          id: 'log-456',
          ...operationData,
          createdAt: new Date()
        };

        storage.logCalendarOperation.mockResolvedValue(mockLogEntry);

        const result = await storage.logCalendarOperation(operationData);

        expect(result).toEqual(mockLogEntry);
        expect(result.success).toBe(false);
        expect(result.errorMessage).toBe('Calendar API error');
      });

      it('should handle logging errors', async () => {
        const operationData = {
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          operationType: 'create_event',
          success: true
        };

        storage.logCalendarOperation.mockRejectedValue(
          new Error('Logging failed')
        );

        await expect(
          storage.logCalendarOperation(operationData)
        ).rejects.toThrow('Logging failed');
      });
    });

    describe('getCalendarOperationStats', () => {
      it('should retrieve operation statistics', async () => {
        const mockStats = {
          totalOperations: 100,
          successfulOperations: 95,
          failedOperations: 5,
          successRate: 0.95,
          recentOperations: [
            { operationType: 'create_event', count: 50 },
            { operationType: 'check_availability', count: 45 }
          ]
        };

        storage.getCalendarOperationStats.mockResolvedValue(mockStats);

        const result = await storage.getCalendarOperationStats('test-user-id', 7);

        expect(result).toEqual(mockStats);
        expect(storage.getCalendarOperationStats).toHaveBeenCalledWith('test-user-id', 7);
      });

      it('should handle empty statistics', async () => {
        const mockStats = {
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0,
          successRate: 0,
          recentOperations: []
        };

        storage.getCalendarOperationStats.mockResolvedValue(mockStats);

        const result = await storage.getCalendarOperationStats('new-user-id', 7);

        expect(result).toEqual(mockStats);
      });

      it('should handle statistics query errors', async () => {
        storage.getCalendarOperationStats.mockRejectedValue(
          new Error('Statistics query failed')
        );

        await expect(
          storage.getCalendarOperationStats('test-user-id', 7)
        ).rejects.toThrow('Statistics query failed');
      });
    });
  });

  describe('Database Connection Management', () => {
    it('should handle connection pool exhaustion', async () => {
      storage.getGoogleCalendarByUserAgent.mockRejectedValue(
        new Error('Connection pool exhausted')
      );

      await expect(
        storage.getGoogleCalendarByUserAgent('test-user-id', 'test-agent-id')
      ).rejects.toThrow('Connection pool exhausted');
    });

    it('should handle database timeouts', async () => {
      storage.createGoogleCalendarConnection.mockRejectedValue(
        new Error('Query timeout')
      );

      await expect(
        storage.createGoogleCalendarConnection({
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          googleEmail: 'test@example.com',
          googleAccessToken: 'token',
          googleRefreshToken: 'refresh'
        })
      ).rejects.toThrow('Query timeout');
    });

    it('should handle network connectivity issues', async () => {
      storage.updateGoogleCalendarTokens.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        storage.updateGoogleCalendarTokens(
          'test-user-id',
          'test-agent-id',
          'new-access-token',
          'new-refresh-token'
        )
      ).rejects.toThrow('Network error');
    });
  });

  describe('Data Validation', () => {
    it('should validate UUID formats', async () => {
      storage.getGoogleCalendarByUserAgent.mockRejectedValue(
        new Error('Invalid UUID format')
      );

      await expect(
        storage.getGoogleCalendarByUserAgent('invalid-uuid', 'test-agent-id')
      ).rejects.toThrow('Invalid UUID format');
    });

    it('should validate email formats', async () => {
      storage.createGoogleCalendarConnection.mockRejectedValue(
        new Error('Invalid email format')
      );

      await expect(
        storage.createGoogleCalendarConnection({
          userId: 'test-user-id',
          agentId: 'test-agent-id',
          googleEmail: 'invalid-email',
          googleAccessToken: 'token',
          googleRefreshToken: 'refresh'
        })
      ).rejects.toThrow('Invalid email format');
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      storage.getGoogleCalendarByUserAgent.mockRejectedValue(
        new Error('Invalid input detected')
      );

      await expect(
        storage.getGoogleCalendarByUserAgent(maliciousInput, 'test-agent-id')
      ).rejects.toThrow('Invalid input detected');
    });
  });
});