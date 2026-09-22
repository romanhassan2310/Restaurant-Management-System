import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ICashReconciliation extends Document {
  shift: Types.ObjectId;
  expectedCash: number;
  actualCash: number;
  difference: number;
  notes?: string;
  reconciledBy?: Types.ObjectId;
  createdAt: Date;
}

const cashReconciliationSchema = new Schema<ICashReconciliation>({
  shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true, unique: true },
  expectedCash: { type: Number, required: true },
  actualCash: { type: Number, required: true, min: 0 },
  difference: { type: Number, required: true },
  notes: { type: String, trim: true },
  reconciledBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const CashReconciliation = mongoose.model<ICashReconciliation>('CashReconciliation', cashReconciliationSchema);
