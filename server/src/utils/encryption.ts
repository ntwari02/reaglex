import crypto from 'crypto';

// Encryption key should be stored in environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt sensitive data (account numbers, routing numbers, etc.)
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return iv + encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  // Check if the text looks like encrypted data (format: iv:encrypted)
  if (!encryptedText.includes(':')) {
    // Not encrypted, return as-is (might be plain text)
    return encryptedText;
  }
  
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const parts = encryptedText.split(':');
    
    // Validate format: should have exactly 2 parts
    if (parts.length !== 2) {
      // Invalid format, return original
      return encryptedText;
    }
    
    const [ivHex, encrypted] = parts;
    
    // Validate IV: should be exactly 32 hex characters (16 bytes * 2)
    if (!ivHex || ivHex.length !== 32 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
      // Invalid IV format, return original
      return encryptedText;
    }
    
    // Validate encrypted data: should be hex and have reasonable length
    if (!encrypted || encrypted.length === 0 || !/^[0-9a-fA-F]+$/.test(encrypted)) {
      // Invalid encrypted data format, return original
      return encryptedText;
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    
    // Validate IV length
    if (iv.length !== IV_LENGTH) {
      return encryptedText;
    }
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    // Only log if it's not a known decryption error (might be corrupted data)
    // Silently return original if decryption fails (data might be plain text or corrupted)
    if (error.code !== 'ERR_OSSL_BAD_DECRYPT') {
      console.error('Decryption error:', error);
    }
    return encryptedText; // Return original if decryption fails
  }
}

/**
 * Mask sensitive data for display (shows only last 4 digits)
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return '****' + accountNumber.slice(-4);
}

/**
 * Mask routing number (shows only last 4 digits)
 */
export function maskRoutingNumber(routingNumber: string): string {
  if (!routingNumber || routingNumber.length < 4) return '****';
  return '****' + routingNumber.slice(-4);
}

