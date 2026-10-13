'use strict';

const crypto = require('crypto');
const { env } = require('../config/env');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const key = Buffer.from(env.OTP_ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) throw new Error('Invalid OTP_ENCRYPTION_KEY length. Must be 32 bytes (64 hex characters).');
  return key;
}

/** Encrypts a short secret. Output format: iv:ciphertext:authTag (hex). */
function encryptOtp(otp) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(otp, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

function decryptOtp(encryptedData) {
  const parts = String(encryptedData).split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(parts[0], 'hex'));
  decipher.setAuthTag(Buffer.from(parts[2], 'hex'));
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encryptOtp, decryptOtp };
