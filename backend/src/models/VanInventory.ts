import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IVanInventory extends Document {
  van: Types.ObjectId;
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  quantity: number;
  minStock?: number;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vanInventorySchema = new Schema<IVanInventory>(
  {
    van: { type: Schema.Types.ObjectId, ref: 'Van', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    minStock: { type: Number, min: 0, default: 0 },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

vanInventorySchema.index({ van: 1, product: 1, variant: 1 }, { unique: true });

export const VanInventory = mongoose.model<IVanInventory>('VanInventory', vanInventorySchema);
