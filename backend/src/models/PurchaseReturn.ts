import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IPurchaseReturnItem { product: Types.ObjectId; variant?: Types.ObjectId; quantity: number; unitCost: number; }
export interface IPurchaseReturn extends Document { returnNumber: string; supplier: Types.ObjectId; purchaseOrder?: Types.ObjectId; items: IPurchaseReturnItem[]; total: number; reason: string; returnedBy?: Types.ObjectId; }
const itemSchema = new Schema<IPurchaseReturnItem>({ product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' }, quantity: { type: Number, required: true, min: 0.000001 }, unitCost: { type: Number, required: true, min: 0 } }, { _id: false });
const schema = new Schema<IPurchaseReturn>({ returnNumber: { type: String, required: true, unique: true }, supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true }, purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' }, items: { type: [itemSchema], required: true }, total: { type: Number, required: true, min: 0 }, reason: { type: String, required: true }, returnedBy: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
export const PurchaseReturn = mongoose.model<IPurchaseReturn>('PurchaseReturn', schema);
