import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type VanSessionStatus = 'active' | 'closed';

export interface IVanSession extends Document {
  van: Types.ObjectId;
  assignedTo: Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  status: VanSessionStatus;
  startOdometer?: number;
  endOdometer?: number;
  startingCash: number;
  endingCashCollected?: number;
  expectedCash?: number;
  cashVariance?: number;
  totalSales: number;
  totalOrdersCount: number;
  notes?: string;
  closedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vanSessionSchema = new Schema<IVanSession>(
  {
    van: { type: Schema.Types.ObjectId, ref: 'Van', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    startOdometer: { type: Number, min: 0 },
    endOdometer: { type: Number, min: 0 },
    startingCash: { type: Number, min: 0, default: 0 },
    endingCashCollected: { type: Number },
    expectedCash: { type: Number },
    cashVariance: { type: Number },
    totalSales: { type: Number, default: 0, min: 0 },
    totalOrdersCount: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

vanSessionSchema.index({ van: 1, status: 1 });
vanSessionSchema.index({ assignedTo: 1, status: 1 });

export const VanSession = mongoose.model<IVanSession>('VanSession', vanSessionSchema);
