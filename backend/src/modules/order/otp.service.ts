import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Order, OrderStatus } from './order.model';
import { encryptOtp } from '../../utils/encryption';
import { env } from '../../config/env';

// Create a schema for OTP reservations
const OtpReservationSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  otpFingerprint: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-expire after 24h as a fallback
});

export const OtpReservation = mongoose.models.OtpReservation || mongoose.model('OtpReservation', OtpReservationSchema);

export class OtpService {
  /**
   * Generates a 4-digit OTP unique among active orders.
   * Returns the plaintext OTP.
   */
  static async generateUniqueDeliveryOtp(orderId: string | mongoose.Types.ObjectId, session?: mongoose.ClientSession, regenerate: boolean = false): Promise<string> {
    const order = await Order.findById(orderId).session(session || null).select('+encryptedOtp +deliveryOtpHash');
    if (!order) throw new Error('Order not found');

    if (!regenerate && order.encryptedOtp && order.deliveryOtpHash) {
      throw new Error('OTP already generated for this order');
    }

    if (regenerate) {
      // Clear old reservation if it exists
      await OtpReservation.deleteMany({ orderId }, { session });
    }

    const maxRetries = 20;
    for (let i = 0; i < maxRetries; i++) {
      // 1. Generate cryptographically secure random 4-digit OTP
      const plaintextOtp = crypto.randomInt(0, 10000).toString().padStart(4, '0');

      // 2. Create deterministic fingerprint for collision detection
      // HMAC-SHA256(OTP_ENCRYPTION_KEY, plaintextOtp)
      const otpFingerprint = crypto
        .createHmac('sha256', env.OTP_ENCRYPTION_KEY)
        .update(plaintextOtp)
        .digest('hex');

      try {
        // 3. Attempt to reserve this fingerprint
        // If it already exists (and hasn't expired), this will throw a duplicate key error (code 11000)
        await OtpReservation.create([{
          orderId: order._id,
          otpFingerprint
        }], { session });

        // Reservation successful! No collision.
        // 4. Encrypt and Hash
        const encryptedOtp = encryptOtp(plaintextOtp);
        const salt = await bcrypt.genSalt(10);
        const deliveryOtpHash = await bcrypt.hash(plaintextOtp, salt);

        // 5. Save to order
        order.encryptedOtp = encryptedOtp;
        order.deliveryOtpHash = deliveryOtpHash;
        order.deliveryOtpExpiry = new Date(Date.now() + 1000 * 60 * 30); // 30 mins
        order.deliveryOtpAttempts = 0;
        order.deliveryVerificationStatus = 'PENDING';
        
        // Ensure atomic update
        await order.save({ session });

        return plaintextOtp;
      } catch (error: any) {
        if (error.code === 11000) {
          // Collision! Continue to next iteration to generate a new OTP
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to generate a unique OTP after multiple retries.');
  }

  /**
   * Release the OTP reservation for an order when it reaches a terminal state.
   */
  static async releaseOtp(orderId: string | mongoose.Types.ObjectId) {
    await OtpReservation.deleteMany({ orderId });
  }
}
