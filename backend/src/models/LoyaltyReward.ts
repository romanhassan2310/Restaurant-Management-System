import mongoose, { Schema, type Document } from 'mongoose';

export interface ILoyaltyReward extends Document {
  title: string;
  description?: string;
  pointsRequired: number;
  rewardType: 'discount_fixed' | 'discount_percent' | 'free_item';
  rewardValue: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyRewardSchema = new Schema<ILoyaltyReward>({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  pointsRequired: { type: Number, required: true, min: 1 },
  rewardType: { type: String, enum: ['discount_fixed', 'discount_percent', 'free_item'], required: true },
  rewardValue: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const LoyaltyReward = mongoose.model<ILoyaltyReward>('LoyaltyReward', loyaltyRewardSchema);
