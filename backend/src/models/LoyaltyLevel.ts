import mongoose, { Schema, type Document } from 'mongoose';

export interface ILoyaltyLevel extends Document {
  name: string;
  minPoints: number;
  minSpend: number;
  pointsMultiplier: number;
  discountPercentage: number;
  perks: string[];
  color: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyLevelSchema = new Schema<ILoyaltyLevel>({
  name: { type: String, required: true, unique: true, trim: true },
  minPoints: { type: Number, default: 0, min: 0 },
  minSpend: { type: Number, default: 0, min: 0 },
  pointsMultiplier: { type: Number, default: 1, min: 0.1 },
  discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
  perks: [{ type: String, trim: true }],
  color: { type: String, default: '#10B981' },
  icon: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const LoyaltyLevel = mongoose.model<ILoyaltyLevel>('LoyaltyLevel', loyaltyLevelSchema);
