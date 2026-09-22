import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ICustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ICustomer extends Document {
  name: string;
  phone?: string;
  email?: string;
  address?: ICustomerAddress;
  notes?: string;
  customerGroup?: Types.ObjectId;
  totalSpending: number;
  purchaseCount: number;
  creditBalance: number;
  segmentationTags: string[];
  leadSource: 'direct' | 'qr_order' | 'pos' | 'import';
  loyaltyPoints: number;
  loyaltyLevel?: Types.ObjectId;
  birthDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
  },
  notes: { type: String, trim: true },
  customerGroup: { type: Schema.Types.ObjectId, ref: 'CustomerGroup' },
  totalSpending: { type: Number, default: 0, min: 0 },
  purchaseCount: { type: Number, default: 0, min: 0 },
  creditBalance: { type: Number, default: 0 },
  segmentationTags: [{ type: String, trim: true }],
  leadSource: { type: String, enum: ['direct', 'qr_order', 'pos', 'import'], default: 'direct' },
  loyaltyPoints: { type: Number, default: 0, min: 0 },
  loyaltyLevel: { type: Schema.Types.ObjectId, ref: 'LoyaltyLevel' },
  birthDate: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

customerSchema.index({ name: 'text', phone: 1, email: 1 });
customerSchema.index({ customerGroup: 1 });
customerSchema.index({ totalSpending: -1 });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);

