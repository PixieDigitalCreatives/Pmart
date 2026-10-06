import mongoose, { Document, Schema } from 'mongoose';

export interface IAddress {
  label: string; // 'Home', 'Work', 'Other'
  street: string;
  city: string;
  state: string;
  pincode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  location?: {
    type: string;
    coordinates: number[];
  };
  isDefault: boolean;
}

export interface ICustomerProfile extends Document {
  user: mongoose.Types.ObjectId;
  fullName: string;
  email?: string;
  addresses: IAddress[];
}

const AddressSchema = new Schema<IAddress>({
  label: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  isDefault: { type: Boolean, default: false }
});

const CustomerProfileSchema = new Schema<ICustomerProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String },
    addresses: [AddressSchema]
  },
  { timestamps: true }
);

export const CustomerProfile = mongoose.model<ICustomerProfile>('CustomerProfile', CustomerProfileSchema);
