'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { env } = require('../../config/env');
const { encryptOtp, decryptOtp } = require('../../utils/encryption');
const { DeliveryVerification } = require('./order.model');

const OTP_TTL_MS = 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Delivery OTPs are stored twice: AES-GCM encrypted so the customer can view it in the app,
 * and bcrypt-hashed so verification never needs the plaintext.
 */
class OtpService {
  static generateCode() {
    const max = 10 ** env.OTP_LENGTH;
    return crypto.randomInt(0, max).toString().padStart(env.OTP_LENGTH, '0');
  }

  /** Sets a fresh OTP on the (unsaved) order document. */
  static async assignNewOtp(order) {
    const otp = this.generateCode();
    order.encryptedOtp = encryptOtp(otp);
    order.deliveryOtpHash = await bcrypt.hash(otp, 10);
    order.deliveryOtpExpiry = new Date(Date.now() + OTP_TTL_MS);
    order.deliveryOtpAttempts = 0;
    order.deliveryVerificationStatus = DeliveryVerification.PENDING;
    return otp;
  }

  static clearOtp(order) {
    order.encryptedOtp = undefined;
    order.deliveryOtpHash = undefined;
    order.deliveryOtpExpiry = undefined;
  }

  static async matches(order, otp) {
    if (!order.deliveryOtpHash) return false;
    return bcrypt.compare(String(otp), order.deliveryOtpHash);
  }

  static reveal(order) {
    return order.encryptedOtp ? decryptOtp(order.encryptedOtp) : null;
  }

  static isExpired(order) {
    return Boolean(order.deliveryOtpExpiry && order.deliveryOtpExpiry < new Date());
  }
}

module.exports = { OtpService, MAX_OTP_ATTEMPTS };
