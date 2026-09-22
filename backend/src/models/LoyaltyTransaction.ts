import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ILoyaltyTransaction extends Document {
  customer: Types.ObjectId;
  type: 'earn' | 'redeem' | 'adjust' | 'expire';
  points: number;
  balanceAfter: number;
  orderId?: Types.ObjectId;
  rewardId?: Types.ObjectId;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['earn', 'redeem', 'adjust', 'expire'], required: true },
  points: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  rewardId: { type: Schema.Types.ObjectId, ref: 'LoyaltyReward' },
  description: { type: String, required: true, trim: true },
}, { timestamps: true });

loyaltyTransactionSchema.index({ customer: 1, createdAt: -1 });

export const LoyaltyTransaction = mongoose.model<ILoyaltyTransaction>('LoyaltyTransaction', loyaltyTransactionSchema);
