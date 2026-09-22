import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type WaitlistStatus = 'waiting' | 'seated' | 'cancelled' | 'expired';

export interface IWaitlistEntry extends Document {
  customer: Types.ObjectId;
  guestCount: number;
  requestedAt: Date;
  status: WaitlistStatus;
  notes?: string;
  assignedTable?: Types.ObjectId;
  createdBy?: Types.ObjectId;
}

const waitlistSchema = new Schema<IWaitlistEntry>({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  guestCount: { type: Number, required: true, min: 1 },
  requestedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['waiting', 'seated', 'cancelled', 'expired'], default: 'waiting' },
  notes: { type: String, trim: true },
  assignedTable: { type: Schema.Types.ObjectId, ref: 'RestaurantTable' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

waitlistSchema.index({ status: 1, requestedAt: 1 });

export const WaitlistEntry = mongoose.model<IWaitlistEntry>('WaitlistEntry', waitlistSchema);
