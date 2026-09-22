import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IStockTransferItem {
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  quantity: number;
}

export interface IStockTransfer extends Document {
  fromLocation: string;
  toLocation: string;
  items: IStockTransferItem[];
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const itemSchema = new Schema<IStockTransferItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
  quantity: { type: Number, required: true, min: 0.000001 },
}, { _id: false });

const stockTransferSchema = new Schema<IStockTransfer>({
  fromLocation: { type: String, required: true, trim: true },
  toLocation: { type: String, required: true, trim: true },
  items: { type: [itemSchema], required: true, validate: [(items: IStockTransferItem[]) => items.length > 0, 'Transfer requires at least one item'] },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const StockTransfer = mongoose.model<IStockTransfer>('StockTransfer', stockTransferSchema);
