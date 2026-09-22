import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type PurchaseRequestStatus = 'draft' | 'submitted' | 'approved' | 'converted' | 'cancelled';
export interface IPurchaseRequestItem { product: Types.ObjectId; variant?: Types.ObjectId; quantity: number; notes?: string; }
export interface IPurchaseRequest extends Document { requestNumber: string; supplier?: Types.ObjectId; items: IPurchaseRequestItem[]; status: PurchaseRequestStatus; notes?: string; requestedBy?: Types.ObjectId; approvedBy?: Types.ObjectId; }
const itemSchema = new Schema<IPurchaseRequestItem>({ product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' }, quantity: { type: Number, required: true, min: 0.000001 }, notes: String }, { _id: false });
const schema = new Schema<IPurchaseRequest>({ requestNumber: { type: String, required: true, unique: true }, supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' }, items: { type: [itemSchema], required: true }, status: { type: String, enum: ['draft', 'submitted', 'approved', 'converted', 'cancelled'], default: 'draft' }, notes: String, requestedBy: { type: Schema.Types.ObjectId, ref: 'User' }, approvedBy: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
schema.index({ status: 1, createdAt: -1 });
export const PurchaseRequest = mongoose.model<IPurchaseRequest>('PurchaseRequest', schema);
