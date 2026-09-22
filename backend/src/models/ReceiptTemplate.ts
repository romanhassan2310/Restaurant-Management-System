import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IReceiptTemplate extends Document {
  name: string;
  header: string;
  footer: string;
  showCustomer: boolean;
  showTax: boolean;
  showPayment: boolean;
  isDefault: boolean;
  updatedBy?: Types.ObjectId;
}

const receiptTemplateSchema = new Schema<IReceiptTemplate>({
  name: { type: String, required: true, trim: true },
  header: { type: String, default: '' },
  footer: { type: String, default: '' },
  showCustomer: { type: Boolean, default: true },
  showTax: { type: Boolean, default: true },
  showPayment: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const ReceiptTemplate = mongoose.model<IReceiptTemplate>('ReceiptTemplate', receiptTemplateSchema);
