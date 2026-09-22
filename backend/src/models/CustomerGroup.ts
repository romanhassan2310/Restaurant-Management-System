import mongoose, { Schema, type Document } from 'mongoose';

export interface ICustomerGroup extends Document {
  name: string;
  description?: string;
  discountPercentage: number;
  minSpendThreshold?: number;
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerGroupSchema = new Schema<ICustomerGroup>({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
  minSpendThreshold: { type: Number, default: 0, min: 0 },
  color: { type: String, default: '#3B82F6' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const CustomerGroup = mongoose.model<ICustomerGroup>('CustomerGroup', customerGroupSchema);
