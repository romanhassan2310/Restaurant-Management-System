import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type PaymentMethod = 'cash' | 'card' | 'qr' | 'mobile_payment' | 'store_credit' | 'gift_card';
export type PaymentStatus = 'completed' | 'refunded' | 'partially_refunded' | 'voided';
export type PaymentGroupType = 'single' | 'split' | 'mixed';

export interface IPayment extends Document {
  order: Types.ObjectId;
  shift?: Types.ObjectId;
  method: PaymentMethod;
  groupType: PaymentGroupType;
  amount: number;
  refundedAmount: number;
  status: PaymentStatus;
  reference?: string;
  notes?: string;
  receivedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  shift: { type: Schema.Types.ObjectId, ref: 'Shift' },
  method: { type: String, enum: ['cash', 'card', 'qr', 'mobile_payment', 'store_credit', 'gift_card'], required: true },
  groupType: { type: String, enum: ['single', 'split', 'mixed'], default: 'single' },
  amount: { type: Number, required: true, min: 0.01 },
  refundedAmount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['completed', 'refunded', 'partially_refunded', 'voided'], default: 'completed' },
  reference: { type: String, trim: true },
  notes: { type: String, trim: true },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

paymentSchema.index({ order: 1, createdAt: -1 });
paymentSchema.index({ shift: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
