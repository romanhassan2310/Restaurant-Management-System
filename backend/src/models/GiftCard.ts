import mongoose, { Schema, type Document } from 'mongoose';

export interface IGiftCard extends Document {
  code: string;
  initialBalance: number;
  currentBalance: number;
  expiryDate?: Date;
  purchaserName?: string;
  purchaserEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  status: 'active' | 'fully_redeemed' | 'expired' | 'disabled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const giftCardSchema = new Schema<IGiftCard>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  initialBalance: { type: Number, required: true, min: 0 },
  currentBalance: { type: Number, required: true, min: 0 },
  expiryDate: { type: Date },
  purchaserName: { type: String, trim: true },
  purchaserEmail: { type: String, lowercase: true, trim: true },
  recipientName: { type: String, trim: true },
  recipientEmail: { type: String, lowercase: true, trim: true },
  status: { type: String, enum: ['active', 'fully_redeemed', 'expired', 'disabled'], default: 'active' },
  notes: { type: String, trim: true },
}, { timestamps: true });

giftCardSchema.index({ code: 1 });
giftCardSchema.index({ status: 1 });

export const GiftCard = mongoose.model<IGiftCard>('GiftCard', giftCardSchema);
