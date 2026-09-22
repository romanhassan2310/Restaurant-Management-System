import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ShiftStatus = 'open' | 'closed';

export interface IShift extends Document {
  user: Types.ObjectId;
  status: ShiftStatus;
  openingCash: number;
  expectedCash: number;
  actualCash?: number;
  cashDifference?: number;
  openedAt: Date;
  closedAt?: Date;
  closingNotes?: string;
}

const shiftSchema = new Schema<IShift>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  openingCash: { type: Number, required: true, min: 0 },
  expectedCash: { type: Number, min: 0, default: 0 },
  actualCash: { type: Number, min: 0 },
  cashDifference: { type: Number },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  closingNotes: { type: String, trim: true },
});

shiftSchema.index({ user: 1, status: 1 });
shiftSchema.index({ openedAt: -1 });

export const Shift = mongoose.model<IShift>('Shift', shiftSchema);
