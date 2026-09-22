import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IProductVariant extends Document {
  product: Types.ObjectId;
  name: string;
  sku: string;
  barcode?: string;
  unit: Types.ObjectId;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productVariantSchema = new Schema<IProductVariant>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    barcode: { type: String, unique: true, sparse: true, trim: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    costPrice: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    stockQuantity: { type: Number, min: 0, default: 0 },
    minimumStock: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productVariantSchema.index({ product: 1, isActive: 1 });

export const ProductVariant = mongoose.model<IProductVariant>('ProductVariant', productVariantSchema);
