import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  RIDER = 'RIDER',
  SHOP_OWNER = 'SHOP_OWNER',
  EMPLOYEE = 'EMPLOYEE',
  ADMIN = 'ADMIN'
}

export enum AuthProvider {
  PHONE = 'PHONE',
  GOOGLE = 'GOOGLE'
}

export interface IUser extends Document {
  phone?: string;
  googleId?: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  phoneVerified: boolean;
  role: UserRole;
  permissions?: string[];
  authProvider: AuthProvider;
  profileComplete: boolean;
  isActive: boolean;
  mustChangePassword?: boolean;
  refreshToken?: string;
  passwordHash?: string;
  setupToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, sparse: true, unique: true },
    googleId: { type: String, sparse: true, unique: true },
    email: { type: String, sparse: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    name: { type: String },
    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      default: UserRole.CUSTOMER,
      required: true 
    },
    permissions: [{ type: String }],
    authProvider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.PHONE
    },
    profileComplete: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    refreshToken: { type: String },
    passwordHash: { type: String, select: false },
    setupToken: { type: String, select: false }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);

// OTP Schema (TTL based, expires in 5 minutes)
// Kept for legacy/future phone OTP if needed by other roles
export interface IOtp extends Document {
  phone: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
}

const OtpSchema = new Schema<IOtp>(
  {
    phone: { type: String, required: true, unique: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: '5m' },
    attempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);
