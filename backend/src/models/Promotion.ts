import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IPromotion extends Document {
  title: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startDate?: Date;
  endDate?: Date;
  applicableCustomerGroups: Types.ObjectId[];
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const promotionSchema = new Schema<IPromotion>({
  title: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  maxDiscountAmount: { type: Number, min: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  applicableCustomerGroups: [{ type: Schema.Types.ObjectId, ref: 'CustomerGroup' }],
  usageLimit: { type: Number, min: 1 },
  usageCount: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

promotionSchema.index({ code: 1 });

export const Promotion = mongoose.model<IPromotion>('Promotion', promotionSchema);
