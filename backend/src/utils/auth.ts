import bcrypt from 'bcryptjs';

/**
 * Normalizes a mobile number.
 * 1. Strips all spaces and non-digit characters (except leading +).
 * 2. If the number is 10 digits (India standard without code), it prepends +91.
 * 3. Otherwise, expects a valid international format starting with +.
 */
export function normalizeMobileNumber(phone: string): string {
  if (!phone) return '';
  // Strip all non-digit and non-plus characters
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If no plus, and it's 10 digits, assume India
  if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+91' + cleaned;
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
