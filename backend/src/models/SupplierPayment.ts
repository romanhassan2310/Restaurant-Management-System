import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type SupplierPaymentMethod = 'cash' | 'card' | 'bank' | 'mobile_payment';
export interface ISupplierPayment extends Document { supplier: Types.ObjectId; invoice?: Types.ObjectId; amount: number; method: SupplierPaymentMethod; reference?: string; notes?: string; paidBy?: Types.ObjectId; paidAt: Date; }
const schema = new Schema<ISupplierPayment>({ supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true }, invoice: { type: Schema.Types.ObjectId, ref: 'PurchaseInvoice' }, amount: { type: Number, required: true, min: 0.01 }, method: { type: String, enum: ['cash', 'card', 'bank', 'mobile_payment'], required: true }, reference: String, notes: String, paidBy: { type: Schema.Types.ObjectId, ref: 'User' }, paidAt: { type: Date, default: Date.now } }, { timestamps: true });
schema.index({ supplier: 1, paidAt: -1 });
export const SupplierPayment = mongoose.model<ISupplierPayment>('SupplierPayment', schema);
