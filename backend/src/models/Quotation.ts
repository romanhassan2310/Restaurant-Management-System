import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotationItem {
  product?: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
}

export interface IQuotation extends Document {
  quotationNumber: string;
  customer?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: IQuotationItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  validUntil: Date;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  convertedOrderId?: mongoose.Types.ObjectId;
  convertedCateringId?: mongoose.Types.ObjectId;
  createdById?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationSchema: Schema = new Schema(
  {
    quotationNumber: { type: String, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        description: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        discount: { type: Number, default: 0, min: 0 },
        taxRate: { type: Number, default: 0, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    validUntil: { type: Date, required: true, index: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
      default: 'draft',
      index: true,
    },
    convertedOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    convertedCateringId: { type: Schema.Types.ObjectId, ref: 'CateringOrder' },
    createdById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IQuotation>('Quotation', QuotationSchema);
