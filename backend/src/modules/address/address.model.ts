import mongoose, { Document, Schema } from 'mongoose';

export interface IAddress extends Document {
  user: mongoose.Types.ObjectId;
  label: 'HOME' | 'WORK' | 'OTHER';
  
  recipientName: string;
  recipientPhone: string;
  
  houseNumber?: string;
  buildingName?: string;
  floor?: string;
  
  street?: string;
  area?: string;
  landmark?: string;
  
  city: string;
  district?: string;
  state: string;
  pincode: string;
  country?: string;
  
  formattedAddress?: string;
  
  location: {
    type: 'Point';
    coordinates: number[]; // [longitude, latitude]
  };
  
  deliveryInstructions?: string;
  
  isDefault: boolean;
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, enum: ['HOME', 'WORK', 'OTHER'], default: 'OTHER' },
    
    recipientName: { type: String, required: true },
    recipientPhone: { type: String, required: true },
    
    houseNumber: { type: String },
    buildingName: { type: String },
    floor: { type: String },
    
    street: { type: String },
    area: { type: String },
    landmark: { type: String },
    
    city: { type: String, required: true },
    district: { type: String },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
    
    formattedAddress: { type: String },
    
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true }
    },
    
    deliveryInstructions: { type: String },
    
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

AddressSchema.index({ location: '2dsphere' });
AddressSchema.index({ user: 1, isDefault: 1 });
AddressSchema.index({ user: 1, isActive: 1 });

export const Address = mongoose.model<IAddress>('Address', AddressSchema);
