import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  category: string;
  amount: number;
  date: Date;
  description: string;
  paymentMethod: string;
  vendor?: string;
  receiptAttachment?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  rejectionReason?: string;
  createdById?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema = new Schema(
  {
    category: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true, trim: true },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash', 'bank_transfer', 'credit_card', 'check', 'other'],
      default: 'cash',
    },
    vendor: { type: String, trim: true },
    receiptAttachment: { type: String, trim: true },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    rejectionReason: { type: String, trim: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
