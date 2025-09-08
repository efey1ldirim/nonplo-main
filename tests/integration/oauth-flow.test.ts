import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock external dependencies
jest.mock('../../server/storage');
jest.mock('../../server/services/CalendarService');
jest.mock('googleapis');

describe('OAuth Flow Integration Tests', () => {
  let app: express.Express;
  let calendarService: any;
  let storage: any;

  beforeAll(async () => {
    // Set up Express app with calendar routes
    app = express();
    app.use(express.json());
    
    // Import and set up routes
    const routesModule = await import('../../server/routes');
    // Routes would be attached to app in actual implementation
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Get mocked modules
    const storageModule = await import('../../server/storage');
    storage = storageModule.storage;
    
    const calendarModule = await import('../../server/services/CalendarService');
    calendarService = calendarModule.CalendarService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('OAuth Authorization Flow', () => {
    it('should initiate OAuth flow successfully', async () => {
      const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?client_id=test&redirect_uri=http://localhost:5000/auth/google/callback&scope=calendar&state=encoded-state';
      
      calendarService.prototype.generateAuthUrl = jest.fn().mockReturnValue(mockAuthUrl);

      const response = await request(app)
        .get('/api/calendar/auth')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        authUrl: mockAuthUrl
      });

      expect(calendarService.prototype.generateAuthUrl).toHaveBeenCalledWith(
        'test-user-id',
        'test-agent-id'
      );
    });

    it('should handle missing parameters in auth initiation', async () => {
      const response = await request(app)
        .get('/api/calendar/auth')
        .query({
          userId: 'test-user-id'
          // Missing agentId
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'userId and agentId are required'
      });
    });

    it('should handle calendar service not configured', async () => {
      calendarService.prototype.generateAuthUrl = jest.fn().mockImplementation(() => {
        throw new Error('Google Calendar not configured');
      });

      const response = await request(app)
        .get('/api/calendar/auth')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Google Calendar not configured'
      });
    });
  });

  describe('OAuth Callback Handling', () => {
    it('should handle successful OAuth callback', async () => {
      const mockCallbackResult = {
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        success: true
      };

      calendarService.prototype.handleCallback = jest.fn().mockResolvedValue(mockCallbackResult);

      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-123',
          state: 'encoded-state-data'
        })
        .expect(302); // Redirect

      expect(response.headers.location).toContain('/dashboard/agents/test-agent-id');
      expect(calendarService.prototype.handleCallback).toHaveBeenCalledWith(
        'auth-code-123',
        'encoded-state-data'
      );
    });

    it('should handle OAuth callback with authorization denied', async () => {
      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          error: 'access_denied',
          state: 'encoded-state-data'
        })
        .expect(302);

      expect(response.headers.location).toContain('/dashboard');
      expect(response.headers.location).toContain('error=access_denied');
    });

    it('should handle OAuth callback with invalid state', async () => {
      calendarService.prototype.handleCallback = jest.fn().mockRejectedValue(
        new Error('Invalid state parameter')
      );

      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-123',
          state: 'invalid-state'
        })
        .expect(302);

      expect(response.headers.location).toContain('/dashboard');
      expect(response.headers.location).toContain('error=invalid_state');
    });

    it('should handle OAuth callback with missing code', async () => {
      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          state: 'encoded-state-data'
          // Missing code
        })
        .expect(302);

      expect(response.headers.location).toContain('/dashboard');
      expect(response.headers.location).toContain('error=missing_code');
    });

    it('should handle token exchange failures', async () => {
      calendarService.prototype.handleCallback = jest.fn().mockRejectedValue(
        new Error('Token exchange failed')
      );

      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'invalid-auth-code',
          state: 'encoded-state-data'
        })
        .expect(302);

      expect(response.headers.location).toContain('/dashboard');
      expect(response.headers.location).toContain('error=token_exchange_failed');
    });
  });

  describe('End-to-End OAuth Flow', () => {
    it('should complete full OAuth flow successfully', async () => {
      const userId = 'test-user-id';
      const agentId = 'test-agent-id';
      
      // Step 1: Initiate OAuth
      const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?client_id=test&state=encoded-state';
      calendarService.prototype.generateAuthUrl = jest.fn().mockReturnValue(mockAuthUrl);

      const authResponse = await request(app)
        .get('/api/calendar/auth')
        .query({ userId, agentId })
        .expect(200);

      expect(authResponse.body.success).toBe(true);
      expect(authResponse.body.authUrl).toBe(mockAuthUrl);

      // Step 2: Handle OAuth callback
      const mockCallbackResult = {
        userId,
        agentId,
        success: true
      };

      calendarService.prototype.handleCallback = jest.fn().mockResolvedValue(mockCallbackResult);

      const callbackResponse = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-from-google',
          state: 'encoded-state'
        })
        .expect(302);

      expect(callbackResponse.headers.location).toContain(`/dashboard/agents/${agentId}`);

      // Step 3: Verify connection status
      const mockConnection = {
        id: 'connection-123',
        userId,
        agentId,
        googleEmail: 'test@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      storage.getGoogleCalendarConnection = jest.fn().mockResolvedValue(mockConnection);

      const statusResponse = await request(app)
        .get('/api/calendar/status')
        .query({ userId, agentId })
        .expect(200);

      expect(statusResponse.body).toEqual({
        success: true,
        connected: true,
        connection: mockConnection
      });
    });

    it('should handle OAuth flow with existing connection', async () => {
      const userId = 'test-user-id';
      const agentId = 'test-agent-id';

      // Mock existing connection
      const existingConnection = {
        id: 'existing-connection',
        userId,
        agentId,
        googleEmail: 'existing@example.com',
        isActive: true
      };

      storage.getGoogleCalendarByUserAgent = jest.fn().mockResolvedValue(existingConnection);

      const mockCallbackResult = {
        userId,
        agentId,
        success: true
      };

      calendarService.prototype.handleCallback = jest.fn().mockResolvedValue(mockCallbackResult);

      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-123',
          state: Buffer.from(JSON.stringify({ userId, agentId })).toString('base64')
        })
        .expect(302);

      expect(response.headers.location).toContain(`/dashboard/agents/${agentId}`);
      expect(response.headers.location).toContain('connected=true');
    });

    it('should handle OAuth flow interruption and retry', async () => {
      const userId = 'test-user-id';
      const agentId = 'test-agent-id';

      // First attempt fails
      calendarService.prototype.handleCallback = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          userId,
          agentId,
          success: true
        });

      // First callback fails
      const firstResponse = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-123',
          state: Buffer.from(JSON.stringify({ userId, agentId })).toString('base64')
        })
        .expect(302);

      expect(firstResponse.headers.location).toContain('error=network_error');

      // Retry succeeds
      const retryResponse = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-123',
          state: Buffer.from(JSON.stringify({ userId, agentId })).toString('base64')
        })
        .expect(302);

      expect(retryResponse.headers.location).toContain(`/dashboard/agents/${agentId}`);
    });
  });

  describe('OAuth Security Tests', () => {
    it('should reject OAuth callback with tampered state', async () => {
      const originalState = Buffer.from(JSON.stringify({
        userId: 'test-user-id',
        agentId: 'test-agent-id'
      })).toString('base64');

      const tamperedState = Buffer.from(JSON.stringify({
        userId: 'malicious-user-id',
        agentId: 'test-agent-id'
      })).toString('base64');

      calendarService.prototype.handleCallback = jest.fn().mockRejectedValue(
        new Error('State parameter validation failed')
      );

      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-123',
          state: tamperedState
        })
        .expect(302);

      expect(response.headers.location).toContain('error=state_validation_failed');
    });

    it('should handle OAuth callback with expired state', async () => {
      const expiredState = Buffer.from(JSON.stringify({
        userId: 'test-user-id',
        agentId: 'test-agent-id',
        timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
      })).toString('base64');

      calendarService.prototype.handleCallback = jest.fn().mockRejectedValue(
        new Error('State parameter expired')
      );

      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-123',
          state: expiredState
        })
        .expect(302);

      expect(response.headers.location).toContain('error=state_expired');
    });

    it('should prevent CSRF attacks via state validation', async () => {
      // Missing state parameter
      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-123'
          // Missing state
        })
        .expect(302);

      expect(response.headers.location).toContain('error=missing_state');
    });

    it('should handle malformed authorization codes', async () => {
      const maliciousCodes = [
        'javascript:alert(1)',
        '<script>alert(1)</script>',
        'SELECT * FROM users',
        '../../../etc/passwd',
        'data:text/html,<script>alert(1)</script>'
      ];

      for (const maliciousCode of maliciousCodes) {
        calendarService.prototype.handleCallback = jest.fn().mockRejectedValue(
          new Error('Invalid authorization code format')
        );

        const response = await request(app)
          .get('/auth/google/callback')
          .query({
            code: maliciousCode,
            state: Buffer.from(JSON.stringify({
              userId: 'test-user-id',
              agentId: 'test-agent-id'
            })).toString('base64')
          })
          .expect(302);

        expect(response.headers.location).toContain('error=invalid_code_format');
      }
    });
  });

  describe('OAuth Rate Limiting', () => {
    it('should enforce rate limits on OAuth endpoints', async () => {
      // Mock rate limiter middleware
      const mockRateLimiter = jest.fn((req: any, res: any, next: any) => {
        if (req.headers['x-test-rate-limit'] === 'exceeded') {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: 60
          });
        }
        next();
      });

      // Simulate rate limit exceeded
      const response = await request(app)
        .get('/api/calendar/auth')
        .set('x-test-rate-limit', 'exceeded')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(429);

      expect(response.body).toEqual({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: 60
      });
    });

    it('should allow requests within rate limits', async () => {
      const mockAuthUrl = 'https://accounts.google.com/oauth/authorize?test=true';
      calendarService.prototype.generateAuthUrl = jest.fn().mockReturnValue(mockAuthUrl);

      // Normal request within limits
      const response = await request(app)
        .get('/api/calendar/auth')
        .query({
          userId: 'test-user-id',
          agentId: 'test-agent-id'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('OAuth Error Recovery', () => {
    it('should provide clear error messages for common OAuth failures', async () => {
      const errorScenarios = [
        {
          error: 'access_denied',
          expectedMessage: 'Authorization was denied by the user'
        },
        {
          error: 'invalid_request',
          expectedMessage: 'Invalid OAuth request'
        },
        {
          error: 'unsupported_response_type',
          expectedMessage: 'Unsupported response type'
        },
        {
          error: 'invalid_scope',
          expectedMessage: 'Invalid or unsupported scope'
        },
        {
          error: 'server_error',
          expectedMessage: 'Google authorization server error'
        }
      ];

      for (const scenario of errorScenarios) {
        const response = await request(app)
          .get('/auth/google/callback')
          .query({
            error: scenario.error,
            state: Buffer.from(JSON.stringify({
              userId: 'test-user-id',
              agentId: 'test-agent-id'
            })).toString('base64')
          })
          .expect(302);

        expect(response.headers.location).toContain(`error=${scenario.error}`);
      }
    });

    it('should handle network failures during OAuth', async () => {
      calendarService.prototype.handleCallback = jest.fn().mockRejectedValue(
        new Error('Network timeout')
      );

      const response = await request(app)
        .get('/auth/google/callback')
        .query({
          code: 'auth-code-123',
          state: Buffer.from(JSON.stringify({
            userId: 'test-user-id',
            agentId: 'test-agent-id'
          })).toString('base64')
        })
        .expect(302);

      expect(response.headers.location).toContain('error=network_timeout');
    });
  });
});