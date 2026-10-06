import mongoose, { Document, Schema } from 'mongoose';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ASSIGN = 'ASSIGN'
}

export interface IAuditLog extends Document {
  user: mongoose.Types.ObjectId; // User who performed the action
  action: AuditAction;
  resource: string; // e.g., 'Order', 'Rider', 'Employee'
  resourceId?: string; 
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: Object.values(AuditAction), required: true },
  resource: { type: String, required: true },
  resourceId: { type: String },
  details: { type: Schema.Types.Mixed },
  ipAddress: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Index for fast querying by resource or user
AuditLogSchema.index({ resource: 1, createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
