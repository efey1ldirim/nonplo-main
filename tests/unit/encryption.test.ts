import { describe, it, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';

describe('Encryption Utilities', () => {
  let encryptionModule: any;
  const testKey = crypto.randomBytes(32).toString('hex');
  
  beforeEach(async () => {
    // Set encryption key
    process.env.CALENDAR_ENCRYPTION_KEY = testKey;
    
    // Import fresh module each test
    delete require.cache[require.resolve('../../server/utils/encryption')];
    encryptionModule = await import('../../server/utils/encryption');
  });

  describe('encrypt', () => {
    it('should encrypt text successfully', () => {
      const plaintext = 'test-access-token-12345';
      const encrypted = encryptionModule.encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^[a-zA-Z0-9+/]+=*$/); // Base64 format
    });

    it('should produce different output for same input (due to IV)', () => {
      const plaintext = 'test-access-token';
      const encrypted1 = encryptionModule.encrypt(plaintext);
      const encrypted2 = encryptionModule.encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = encryptionModule.encrypt('');
      expect(encrypted).toBeDefined();
    });

    it('should handle special characters', () => {
      const plaintext = 'token-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptionModule.encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'token-with-unicode-türkçe-çalışır-mı';
      const encrypted = encryptionModule.encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text successfully', () => {
      const plaintext = 'test-access-token-12345';
      const encrypted = encryptionModule.encrypt(plaintext);
      const decrypted = encryptionModule.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle multiple encrypt/decrypt cycles', () => {
      const plaintext = 'test-token';
      
      const encrypted1 = encryptionModule.encrypt(plaintext);
      const decrypted1 = encryptionModule.decrypt(encrypted1);
      
      const encrypted2 = encryptionModule.encrypt(decrypted1);
      const decrypted2 = encryptionModule.decrypt(encrypted2);
      
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should handle empty string decryption', () => {
      const encrypted = encryptionModule.encrypt('');
      const decrypted = encryptionModule.decrypt(encrypted);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters decryption', () => {
      const plaintext = 'token!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptionModule.encrypt(plaintext);
      const decrypted = encryptionModule.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters decryption', () => {
      const plaintext = 'türkçe-token-çalışır';
      const encrypted = encryptionModule.encrypt(plaintext);
      const decrypted = encryptionModule.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => {
        encryptionModule.decrypt('invalid-encrypted-data');
      }).toThrow();
    });

    it('should throw error for malformed base64', () => {
      expect(() => {
        encryptionModule.decrypt('not-base64!@#$%');
      }).toThrow();
    });

    it('should throw error for truncated encrypted data', () => {
      const plaintext = 'test-token';
      const encrypted = encryptionModule.encrypt(plaintext);
      const truncated = encrypted.slice(0, -10); // Remove last 10 chars
      
      expect(() => {
        encryptionModule.decrypt(truncated);
      }).toThrow();
    });
  });

  describe('encryption key validation', () => {
    it('should handle missing encryption key', () => {
      delete process.env.CALENDAR_ENCRYPTION_KEY;
      
      expect(() => {
        delete require.cache[require.resolve('../../server/utils/encryption')];
        require('../../server/utils/encryption');
      }).toThrow();
    });

    it('should handle invalid encryption key format', () => {
      process.env.CALENDAR_ENCRYPTION_KEY = 'invalid-key';
      
      expect(() => {
        delete require.cache[require.resolve('../../server/utils/encryption')];
        require('../../server/utils/encryption');
      }).toThrow();
    });

    it('should handle short encryption key', () => {
      process.env.CALENDAR_ENCRYPTION_KEY = '0123456789abcdef'; // 16 chars instead of 64
      
      expect(() => {
        delete require.cache[require.resolve('../../server/utils/encryption')];
        require('../../server/utils/encryption');
      }).toThrow();
    });
  });

  describe('performance and security', () => {
    it('should encrypt/decrypt large tokens efficiently', () => {
      const largeToken = 'a'.repeat(1000); // 1KB token
      
      const startTime = Date.now();
      const encrypted = encryptionModule.encrypt(largeToken);
      const decrypted = encryptionModule.decrypt(encrypted);
      const endTime = Date.now();
      
      expect(decrypted).toBe(largeToken);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should use proper AES-256-GCM encryption', () => {
      const plaintext = 'test-token';
      const encrypted = encryptionModule.encrypt(plaintext);
      
      // Check that encrypted data has proper structure
      const buffer = Buffer.from(encrypted, 'base64');
      expect(buffer.length).toBeGreaterThan(16); // IV + encrypted data + auth tag
    });

    it('should produce cryptographically secure randomness', () => {
      const plaintext = 'same-input';
      const results = new Set();
      
      // Generate 100 encryptions of same input
      for (let i = 0; i < 100; i++) {
        results.add(encryptionModule.encrypt(plaintext));
      }
      
      // All should be different due to random IV
      expect(results.size).toBe(100);
    });
  });
});