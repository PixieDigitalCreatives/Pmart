'use strict';

const crypto = require('crypto');
const { env } = require('../config/env');
const { hashToken } = require('./auth');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(str) {
  const clean = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotpSecret() {
  const bytes = crypto.randomBytes(20);
  return {
    raw: bytes,
    base32: base32Encode(bytes)
  };
}

function generateTotp(secretBytes, timeStepWindow = 0) {
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30) + timeStepWindow;

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', secretBytes);
  hmac.update(counterBuf);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

function verifyTotp(token, secretBytes) {
  if (!token || String(token).length !== 6) return false;
  // Check windows: current step, past step (-1), future step (+1) for clock drift tolerance
  for (let w = -1; w <= 1; w++) {
    if (generateTotp(secretBytes, w) === String(token)) {
      return true;
    }
  }
  return false;
}

function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char hex code
    codes.push(code);
  }
  return codes;
}

// AES-256-GCM encryption for TOTP secret
function encryptSecret(plaintext) {
  const key = Buffer.from(env.OTP_ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(ciphertext) {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const key = Buffer.from(env.OTP_ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

module.exports = {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  generateRecoveryCodes,
  encryptSecret,
  decryptSecret
};

