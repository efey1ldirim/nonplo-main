import crypto from 'crypto';

const algorithm = 'aes-256-cbc';

// Generate a secure encryption key if not provided
const getEncryptionKey = (): Buffer => {
  const envKey = process.env.CALENDAR_ENCRYPTION_KEY;
  
  if (envKey) {
    if (envKey.length !== 64) {
      throw new Error('CALENDAR_ENCRYPTION_KEY must be 64 characters (256-bit hex)');
    }
    return Buffer.from(envKey, 'hex');
  }
  
  // Fallback: generate from existing keys for development
  const fallbackSeed = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.substring(0, 32) || 'nonplo-calendar-default-seed';
  return crypto.scryptSync(fallbackSeed, 'salt', 32);
};

const key = getEncryptionKey();

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Format: iv:encryptedData
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedData: string): string {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data: data is empty or not string');
    }
    
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format - expected 2 parts separated by :');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error details:', error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}