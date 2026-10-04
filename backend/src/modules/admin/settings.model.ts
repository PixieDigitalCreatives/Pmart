import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  freeDeliveryThreshold: number;
  baseDeliveryFee: number;
  platformHandlingFee: number;
}

const SettingsSchema = new Schema<ISettings>({
  freeDeliveryThreshold: { type: Number, default: 299 },
  baseDeliveryFee: { type: Number, default: 15 },
  platformHandlingFee: { type: Number, default: 5 }
}, { timestamps: true });

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
