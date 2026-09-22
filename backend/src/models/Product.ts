import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ProductType = 'raw_material' | 'packaging' | 'ingredient' | 'prepared' | 'retail';

export interface IProduct extends Document {
  name: string;
  sku: string;
  barcode?: string;
  category: Types.ObjectId;
  unit: Types.ObjectId;
  type: ProductType;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  reorderLevel: number;
  trackInventory: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    barcode: { type: String, unique: true, sparse: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    type: { type: String, enum: ['raw_material', 'packaging', 'ingredient', 'prepared', 'retail'], required: true },
    description: { type: String, trim: true },
    costPrice: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    stockQuantity: { type: Number, min: 0, default: 0 },
    minimumStock: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 0 },
    trackInventory: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ stockQuantity: 1, reorderLevel: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
