import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IReceipt extends Document {
  receiptNumber: string;
  order: Types.ObjectId;
  total: number;
  issuedBy?: Types.ObjectId;
  printCount: number;
  lastPrintedAt?: Date;
  issuedAt: Date;
}

const receiptSchema = new Schema<IReceipt>({
  receiptNumber: { type: String, required: true, unique: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  total: { type: Number, required: true, min: 0 },
  issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  printCount: { type: Number, default: 0 },
  lastPrintedAt: { type: Date },
  issuedAt: { type: Date, default: Date.now },
});

receiptSchema.index({ issuedAt: -1 });

export const Receipt = mongoose.model<IReceipt>('Receipt', receiptSchema);
