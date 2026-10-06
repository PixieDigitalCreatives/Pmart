import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { User, UserRole, AuthProvider, IUser } from './auth.model';
import { CustomerProfile } from '../users/user.model';
import { normalizeMobileNumber, hashPassword, verifyPassword } from '../../utils/auth';
import { firebaseAuth } from '../../config/firebase-admin';

export class AuthService {

  static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static generateTokens(userId: string) {
    const accessToken = jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    return { accessToken, refreshToken };
  }

  static async registerCustomer(data: { name: string; phone: string; password: string }) {
    const normalizedPhone = normalizeMobileNumber(data.phone);

    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      throw new Error('This mobile number is already associated with another account');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await User.create({
      name: data.name,
      phone: normalizedPhone,
      passwordHash,
      role: UserRole.CUSTOMER,
      authProvider: AuthProvider.PHONE,
      profileComplete: true,
      isActive: true,
    });

    await CustomerProfile.create({
      user: (user as any)._id,
      fullName: data.name,
      addresses: []
    });

    const { accessToken, refreshToken } = this.generateTokens((user as any)._id.toString());
    user.refreshToken = this.hashData(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
  }

  static async googleLogin(idToken: string) {
    // Verify the Firebase ID token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { uid, email, name, email_verified } = decodedToken as any;

    // Look for existing user by googleId
    let user = await User.findOne({ googleId: uid }).select('+passwordHash') as any;

    if (!user && email) {
      // If not found by googleId, try by email
      user = await User.findOne({ email }).select('+passwordHash') as any;
      if (user) {
        // Link google account to existing user
        user.googleId = uid;
        user.emailVerified = user.emailVerified || email_verified;
        if (user.authProvider !== AuthProvider.GOOGLE) {
           user.authProvider = AuthProvider.GOOGLE;
        }
        await user.save();
      }
    }

    if (!user) {
      // Create new user if not found
      user = await User.create({
        googleId: uid,
        email: email,
        emailVerified: email_verified || false,
        name: name || '',
        role: UserRole.CUSTOMER,
        authProvider: AuthProvider.GOOGLE,
        profileComplete: false,
        isActive: true,
      });
    }

    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    const { accessToken, refreshToken } = this.generateTokens((user as any)._id.toString());
    user.refreshToken = this.hashData(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
  }

  static async completeProfile(userId: string, data: { name: string; phone: string; password?: string; confirmPassword?: string }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const normalizedPhone = normalizeMobileNumber(data.phone);

    // Check if phone belongs to another user
    const existingUser = await User.findOne({ phone: normalizedPhone, _id: { $ne: userId } });
    if (existingUser) {
      throw new Error('This mobile number is already associated with another account');
    }

    user.name = data.name;
    user.phone = normalizedPhone;
    
    if (data.password) {
      user.passwordHash = await hashPassword(data.password);
    }
    
    user.profileComplete = true;
    await user.save();

    if (user.role === UserRole.CUSTOMER) {
      // Ensure customer profile exists
      let profile = await CustomerProfile.findOne({ user: userId });
      if (!profile) {
        await CustomerProfile.create({
          user: userId,
          fullName: data.name,
          addresses: []
        });
      } else {
        profile.fullName = data.name;
        await profile.save();
      }
    }

    return user;
  }

  static async enrollRider(token: string, password: string) {
    const user = await User.findOne({ setupToken: token }).select('+setupTokenExpires');
    if (!user) {
      throw new Error('Invalid or expired setup token');
    }

    if (user.setupTokenExpires && user.setupTokenExpires < new Date()) {
      throw new Error('Setup token has expired');
    }

    if (user.role !== UserRole.RIDER) {
      throw new Error('Invalid user role for rider enrollment');
    }

    user.passwordHash = await hashPassword(password);
    user.setupToken = undefined; // Single-use
    user.profileComplete = true; // Mark onboarding as complete
    await user.save();

    // Also update profileComplete in RiderProfile
    const { RiderProfile } = require('../rider/rider.model');
    await RiderProfile.updateOne({ user: user._id }, { profileComplete: true });

    return user;
  }

  static async login(data: { phone: string; password: string }) {
    const normalizedPhone = normalizeMobileNumber(data.phone);

    const user = await User.findOne({ phone: normalizedPhone }).select('+passwordHash');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    if (!user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await verifyPassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const { accessToken, refreshToken } = this.generateTokens((user as any)._id.toString());
    user.refreshToken = this.hashData(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
  }

  static async setupPassword(userId: string, password: string) {
    const passwordHash = await hashPassword(password);
    
    // Atomically check that the passwordHash does not exist or is null, and set it.
    const updatedUser = await User.findOneAndUpdate(
      { 
        _id: userId, 
        $or: [
          { passwordHash: { $exists: false } },
          { passwordHash: null }
        ]
      },
      { $set: { passwordHash } },
      { new: true }
    );

    if (!updatedUser) {
      // If no user was updated, either the user doesn't exist or already has a password.
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }
      throw new Error('Password already set');
    }
    
    return updatedUser;
  }

  static async refreshTokens(token: string) {
    const tokenHash = this.hashData(token);
    const user = await User.findOne({ refreshToken: tokenHash });

    if (!user || !user.isActive) {
      throw new Error('Invalid refresh token');
    }

    const { accessToken, refreshToken } = this.generateTokens((user as any)._id.toString());
    user.refreshToken = this.hashData(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.passwordHash) {
      throw new Error('Current user has no password set');
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('Incorrect current password');
    }
    if (newPassword === currentPassword) {
      throw new Error('New password cannot be identical to the current password');
    }

    user.passwordHash = await hashPassword(newPassword);
    
    // Clear mustChangePassword flag on successful password change
    user.mustChangePassword = false;
    // Invalidate sessions / refresh tokens
    const { accessToken, refreshToken } = this.generateTokens((user as any)._id.toString());
    user.refreshToken = this.hashData(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
  }

  static async logout(userId: string) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }
}
