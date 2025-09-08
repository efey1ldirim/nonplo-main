import { beforeAll, afterAll, afterEach } from '@jest/globals';

// Test environment setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.GOOGLE_CALENDAR_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'http://localhost:5000/auth/google/callback';
  process.env.CALENDAR_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  
  // Import production config after setting env vars
  const { setupDevelopmentKeys } = await import('../server/config/production');
  setupDevelopmentKeys();
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Cleanup after all tests
});