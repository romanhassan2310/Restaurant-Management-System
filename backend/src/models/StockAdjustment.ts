import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IStockAdjustmentItem {
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  quantity: number;
  reason: string;
}

export interface IStockAdjustment extends Document {
  items: IStockAdjustmentItem[];
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const itemSchema = new Schema<IStockAdjustmentItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
  quantity: { type: Number, required: true },
  reason: { type: String, required: true, trim: true },
}, { _id: false });

const stockAdjustmentSchema = new Schema<IStockAdjustment>({
  items: { type: [itemSchema], required: true, validate: [(items: IStockAdjustmentItem[]) => items.length > 0, 'Adjustment requires at least one item'] },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const StockAdjustment = mongoose.model<IStockAdjustment>('StockAdjustment', stockAdjustmentSchema);
