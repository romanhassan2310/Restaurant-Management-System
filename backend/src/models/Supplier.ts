import mongoose, { Schema, type Document } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  paymentTermsDays: number;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema({ line1: String, line2: String, city: String, state: String, postalCode: String, country: String }, { _id: false });
const supplierSchema = new Schema<ISupplier>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  address: { type: addressSchema },
  paymentTermsDays: { type: Number, min: 0, default: 0 },
  balance: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

supplierSchema.index({ name: 'text', code: 1 });
export const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);
