import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IPaymentAudit extends Document {
  action: string;
  entity: string;
  entityId: string;
  amount?: number;
  method?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  user?: Types.ObjectId;
  ipAddress?: string;
  createdAt: Date;
}

const paymentAuditSchema = new Schema<IPaymentAudit>({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  amount: { type: Number },
  method: { type: String },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  ipAddress: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

paymentAuditSchema.index({ entityId: 1, createdAt: -1 });

export const PaymentAudit = mongoose.model<IPaymentAudit>('PaymentAudit', paymentAuditSchema);
