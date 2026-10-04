import mongoose, { Document, Schema } from 'mongoose';

export interface IShop extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  isActive: boolean;
  rating: number;
  openTime: string;
  closeTime: string;
  imageUrl?: string;
}

const ShopSchema = new Schema<IShop>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      }
    },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    openTime: { type: String, required: true },
    closeTime: { type: String, required: true },
    imageUrl: { type: String }
  },
  { timestamps: true }
);

export const Shop = mongoose.model<IShop>('Shop', ShopSchema);
