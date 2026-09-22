import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type PayrollPeriodStatus = 'draft' | 'approved' | 'paid';

export interface IPayrollPeriod extends Document {
  title: string;
  startDate: Date;
  endDate: Date;
  status: PayrollPeriodStatus;
  totalPaid: number;
  approvedBy?: Types.ObjectId;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const payrollPeriodSchema = new Schema<IPayrollPeriod>({
  title: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
  totalPaid: { type: Number, default: 0, min: 0 },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  paidAt: { type: Date },
}, { timestamps: true });

payrollPeriodSchema.index({ startDate: 1, endDate: 1 });

export const PayrollPeriod = mongoose.model<IPayrollPeriod>('PayrollPeriod', payrollPeriodSchema);
