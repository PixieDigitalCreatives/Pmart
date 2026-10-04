import mongoose, { Document, Schema } from 'mongoose';

export enum RiderAvailability {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

export interface IRiderProfile extends Document {
  user: mongoose.Types.ObjectId;
  fullName: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  availabilityStatus: RiderAvailability;
  currentDelivery?: mongoose.Types.ObjectId;
  rating: number;
  completedDeliveries: number;
  totalDeliveries: number;
  lastLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
  isActive: boolean;
  profileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RiderProfileSchema = new Schema<IRiderProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String },
    phone: { type: String },
    vehicleType: { type: String },
    vehicleNumber: { type: String },
    licenseNumber: { type: String },
    availabilityStatus: { 
      type: String, 
      enum: Object.values(RiderAvailability), 
      default: RiderAvailability.OFFLINE 
    },
    currentDelivery: { type: Schema.Types.ObjectId, ref: 'Order' },
    rating: { type: Number, default: 5.0 },
    completedDeliveries: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    lastLocation: {
      lat: { type: Number },
      lng: { type: Number },
      timestamp: { type: Date }
    },
    isActive: { type: Boolean, default: true },
    profileComplete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const RiderProfile = mongoose.model<IRiderProfile>('RiderProfile', RiderProfileSchema);

export interface IRiderLocation extends Document {
  riderId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

const RiderLocationSchema = new Schema<IRiderLocation>({
  riderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  accuracy: { type: Number },
  speed: { type: Number },
  heading: { type: Number },
  timestamp: { type: Date, required: true }
});

RiderLocationSchema.index({ location: '2dsphere' });

export const RiderLocation = mongoose.model<IRiderLocation>('RiderLocation', RiderLocationSchema);
