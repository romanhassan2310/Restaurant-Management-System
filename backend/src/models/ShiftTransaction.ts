import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ShiftTransactionType = 'payment' | 'refund' | 'cash_in' | 'cash_out' | 'adjustment';

export interface IShiftTransaction extends Document {
  shift: Types.ObjectId;
  type: ShiftTransactionType;
  amount: number;
  method?: string;
  order?: Types.ObjectId;
  payment?: Types.ObjectId;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const shiftTransactionSchema = new Schema<IShiftTransaction>({
  shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
  type: { type: String, enum: ['payment', 'refund', 'cash_in', 'cash_out', 'adjustment'], required: true },
  amount: { type: Number, required: true },
  method: { type: String, trim: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order' },
  payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

shiftTransactionSchema.index({ shift: 1, createdAt: -1 });

export const ShiftTransaction = mongoose.model<IShiftTransaction>('ShiftTransaction', shiftTransactionSchema);
