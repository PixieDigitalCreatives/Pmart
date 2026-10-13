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

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** SHA-256 hex digest used for storing refresh and setup tokens. */
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { E164_REGEX, normalizeMobileNumber, isValidMobile, hashPassword, verifyPassword, hashToken };
