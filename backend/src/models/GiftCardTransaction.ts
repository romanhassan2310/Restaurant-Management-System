import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IGiftCardTransaction extends Document {
  giftCard: Types.ObjectId;
  giftCardCode: string;
  type: 'issue' | 'redemption' | 'reload' | 'void';
  amount: number;
  balanceAfter: number;
  orderId?: Types.ObjectId;
  branch?: Types.ObjectId;
  performedBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const giftCardTransactionSchema = new Schema<IGiftCardTransaction>({
  giftCard: { type: Schema.Types.ObjectId, ref: 'GiftCard', required: true },
  giftCardCode: { type: String, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ['issue', 'redemption', 'reload', 'void'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
}, { timestamps: true });

giftCardTransactionSchema.index({ giftCard: 1, createdAt: -1 });

export const GiftCardTransaction = mongoose.model<IGiftCardTransaction>('GiftCardTransaction', giftCardTransactionSchema);
