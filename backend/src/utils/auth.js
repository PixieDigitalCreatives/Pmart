'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Normalizes a mobile number to E.164.
 * - Strips spaces and punctuation.
 * - 10-digit numbers are treated as Indian numbers (+91).
 * - 91XXXXXXXXXX and 0XXXXXXXXXX are converted to +91XXXXXXXXXX.
 * Returns '' for empty input. Callers must check the result with isValidMobile().
 */
function normalizeMobileNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).trim().replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) cleaned = `+91${cleaned}`;
    else if (cleaned.length === 12 && cleaned.startsWith('91')) cleaned = `+${cleaned}`;
    else if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = `+91${cleaned.slice(1)}`;
  }
  return cleaned;
}

function isValidMobile(phone) {
  return E164_REGEX.test(phone || '');
}

const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 10 : 12;

// Constant dummy hash to ensure constant-time response when user is not found
const DUMMY_PASSWORD_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8p2fJvS7w8M4mF9l0q9T1.rG6WzG.G';

const COMMON_PASSWORDS = new Set([
  'password', 'password123', 'admin123', '12345678', '123456789', '1234567890',
  'qwerty123', 'welcome123', 'pmart123', 'letmein123', 'iloveyou'
]);

function validatePasswordStrength(password, phone = '') {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return { valid: false, message: 'Password is too common. Please choose a stronger password.' };
  }
  if (phone) {
    const rawDigits = String(phone).replace(/\D/g, '');
    if (rawDigits.length >= 6 && password.includes(rawDigits.slice(-6))) {
      return { valid: false, message: 'Password must not contain parts of your mobile number' };
    }
  }
  return { valid: true };
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** SHA-256 hex digest used for storing refresh and setup tokens. */
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = {
  E164_REGEX,
  normalizeMobileNumber,
  isValidMobile,
  hashPassword,
  verifyPassword,
  hashToken,
  DUMMY_PASSWORD_HASH,
  COMMON_PASSWORDS,
  validatePasswordStrength
};
