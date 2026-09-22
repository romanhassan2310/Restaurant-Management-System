import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ICreditTransaction extends Document {
  customer: Types.ObjectId;
  type: 'deposit' | 'deduction' | 'order_payment' | 'order_refund';
  amount: number;
  balanceAfter: number;
  orderId?: Types.ObjectId;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const creditTransactionSchema = new Schema<ICreditTransaction>({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['deposit', 'deduction', 'order_payment', 'order_refund'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

creditTransactionSchema.index({ customer: 1, createdAt: -1 });

export const CreditTransaction = mongoose.model<ICreditTransaction>('CreditTransaction', creditTransactionSchema);
