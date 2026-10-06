import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';

export function encryptOtp(otp: string): string {
  const key = Buffer.from(env.OTP_ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) throw new Error('Invalid encryption key length. Must be 32 bytes (64 hex characters).');

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:encryptedData:authTag
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decryptOtp(encryptedData: string): string {
  const key = Buffer.from(env.OTP_ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) throw new Error('Invalid encryption key length. Must be 32 bytes (64 hex characters).');

  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');

  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
