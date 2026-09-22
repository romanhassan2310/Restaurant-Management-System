import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IInvoiceItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  order: Types.ObjectId;
  customer?: Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  items: IInvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceChargeTotal: number;
  total: number;
  paymentTotal: number;
  status: 'issued' | 'voided';
  issuedAt: Date;
  issuedBy?: Types.ObjectId;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>({
  invoiceNumber: { type: String, required: true, unique: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, trim: true },
  customerPhone: { type: String, trim: true },
  items: { type: [invoiceItemSchema], required: true },
  subtotal: { type: Number, required: true },
  discountTotal: { type: Number, required: true },
  taxTotal: { type: Number, required: true },
  serviceChargeTotal: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentTotal: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['issued', 'voided'], default: 'issued' },
  issuedAt: { type: Date, default: Date.now },
  issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.index({ issuedAt: -1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
