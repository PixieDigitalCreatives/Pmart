import mongoose, { Document, Schema } from 'mongoose';

export enum ProgressionJobType {
  PICKUP = 'PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY'
}

export enum ProgressionJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface IOrderProgressionJob extends Document {
  order: mongoose.Types.ObjectId;
  rider: mongoose.Types.ObjectId;
  type: ProgressionJobType;
  status: ProgressionJobStatus;
  executeAt: Date;
  lockedAt?: Date;
  attempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderProgressionJobSchema = new Schema<IOrderProgressionJob>({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  rider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: Object.values(ProgressionJobType), required: true },
  status: { type: String, enum: Object.values(ProgressionJobStatus), default: ProgressionJobStatus.PENDING },
  executeAt: { type: Date, required: true },
  lockedAt: { type: Date },
  attempts: { type: Number, default: 0 },
  lastError: { type: String }
}, {
  timestamps: true
});

// Indexes for efficiently picking up pending jobs that are due for execution
orderProgressionJobSchema.index({ status: 1, executeAt: 1 });
orderProgressionJobSchema.index({ order: 1, type: 1 }, { unique: true }); // Prevent duplicate jobs of the same type for the same order

export const OrderProgressionJob = mongoose.model<IOrderProgressionJob>('OrderProgressionJob', orderProgressionJobSchema);
