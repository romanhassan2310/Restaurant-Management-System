import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'wastage' | 'return_in' | 'return_out';

export interface IStockMovement extends Document {
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  fromLocation?: string;
  toLocation?: string;
  performedBy?: Types.ObjectId;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
    type: { type: String, enum: ['purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'wastage', 'return_in', 'return_out'], required: true },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceType: { type: String, trim: true },
    referenceId: { type: String, trim: true },
    notes: { type: String, trim: true },
    fromLocation: { type: String, trim: true },
    toLocation: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ product: 1, createdAt: -1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
