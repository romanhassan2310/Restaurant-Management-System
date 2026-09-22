import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IGoodsReceiptItem { product: Types.ObjectId; variant?: Types.ObjectId; quantity: number; unitCost: number; }
export interface IGoodsReceipt extends Document { receiptNumber: string; purchaseOrder: Types.ObjectId; supplier: Types.ObjectId; items: IGoodsReceiptItem[]; total: number; receivedBy?: Types.ObjectId; receivedAt: Date; notes?: string; }
const itemSchema = new Schema<IGoodsReceiptItem>({ product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' }, quantity: { type: Number, required: true, min: 0.000001 }, unitCost: { type: Number, required: true, min: 0 } }, { _id: false });
const schema = new Schema<IGoodsReceipt>({ receiptNumber: { type: String, required: true, unique: true }, purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true }, supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true }, items: { type: [itemSchema], required: true }, total: { type: Number, required: true, min: 0 }, receivedBy: { type: Schema.Types.ObjectId, ref: 'User' }, receivedAt: { type: Date, default: Date.now }, notes: String });
schema.index({ supplier: 1, receivedAt: -1 });
export const GoodsReceipt = mongoose.model<IGoodsReceipt>('GoodsReceipt', schema);
