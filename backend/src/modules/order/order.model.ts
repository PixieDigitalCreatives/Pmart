import mongoose, { Document, Schema } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  RETRY = 'RETRY'
}

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: mongoose.Types.ObjectId;
  shop: mongoose.Types.ObjectId;
  rider?: mongoose.Types.ObjectId;
  items: IOrderItem[];
  subTotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryAddress: {
    recipientName?: string;
    recipientPhone?: string;
    label?: string;
    houseNumber?: string;
    buildingName?: string;
    apartment?: string;
    floor?: string;
    landmark?: string;
    street: string;
    area?: string;
    city: string;
    district?: string;
    state: string;
    pincode: string;
    country?: string;
    formattedAddress?: string;
    coordinates: { lat: number; lng: number };
  };
  deliveryInstructions?: string;
  paymentMethod: string;
  paymentStatus: string;
  encryptedOtp?: string;
  deliveryOtpHash?: string;
  deliveryOtpExpiry?: Date;
  deliveryOtpAttempts: number;
  deliveryVerificationStatus?: string;
  idempotencyKey?: string;
  tracking?: {
    location: { lat: number; lng: number };
    updatedAt: Date;
  };
  statusHistory: Array<{
    status: OrderStatus;
    changedAt: Date;
    changedBy?: mongoose.Types.ObjectId;
    actorRole?: string;
    note?: string;
  }>;
  assignedAt?: Date;
  pickedUpAt?: Date;
  outForDeliveryAt?: Date;
  deliveredAt?: Date;
  rejectedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true }
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    rider: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [OrderItemSchema],
    subTotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
    deliveryAddress: {
      recipientName: { type: String },
      recipientPhone: { type: String },
      label: { type: String },
      houseNumber: { type: String },
      buildingName: { type: String },
      apartment: { type: String },
      floor: { type: String },
      landmark: { type: String },
      street: { type: String, required: true },
      area: { type: String },
      city: { type: String, required: true },
      district: { type: String },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String },
      formattedAddress: { type: String },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] } // [lng, lat]
      }
    },
    deliveryInstructions: { type: String },
    paymentMethod: { type: String, required: true, default: 'COD' },
    paymentStatus: { type: String, required: true, default: 'PENDING' },
    encryptedOtp: { type: String, select: false },
    deliveryOtpHash: { type: String, select: false },
    deliveryOtpExpiry: { type: Date },
    deliveryOtpAttempts: { type: Number, default: 0 },
    deliveryVerificationStatus: { type: String, default: 'PENDING' },
    idempotencyKey: { type: String, unique: true, sparse: true },
    tracking: {
      location: {
        lat: { type: Number },
        lng: { type: Number }
      },
      updatedAt: { type: Date }
    },
    statusHistory: [
      {
        status: { type: String, enum: Object.values(OrderStatus), required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        actorRole: { type: String, enum: ['ADMIN', 'RIDER', 'CUSTOMER', 'SYSTEM'] },
        note: { type: String }
      }
    ],
    assignedAt: { type: Date },
    pickedUpAt: { type: Date },
    outForDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    rejectedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String }
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);

export interface IOrderEvent extends Document {
  order: mongoose.Types.ObjectId;
  status: OrderStatus;
  notes?: string;
  triggeredBy: mongoose.Types.ObjectId;
}

const OrderEventSchema = new Schema<IOrderEvent>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    status: { type: String, enum: Object.values(OrderStatus), required: true },
    notes: { type: String },
    triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

export const OrderEvent = mongoose.model<IOrderEvent>('OrderEvent', OrderEventSchema);
