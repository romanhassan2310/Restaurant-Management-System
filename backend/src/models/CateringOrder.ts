import mongoose, { Schema, Document } from 'mongoose';

export interface ICateringMenuItem {
  product?: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface ICateringOrder extends Document {
  cateringNumber: string;
  customer?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  eventName: string;
  eventDate: Date;
  guestCount: number;
  venueAddress: string;
  menuItems: ICateringMenuItem[];
  deliveryFee: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  depositPaid: number;
  balanceDue: number;
  status:
    | 'inquiry'
    | 'quoted'
    | 'confirmed'
    | 'in_preparation'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  quotationRef?: mongoose.Types.ObjectId;
  orderRef?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CateringOrderSchema: Schema = new Schema(
  {
    cateringNumber: { type: String, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true },
    eventName: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true, index: true },
    guestCount: { type: Number, required: true, min: 1 },
    venueAddress: { type: String, required: true, trim: true },
    menuItems: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
        notes: { type: String, trim: true },
      },
    ],
    deliveryFee: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    depositPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        'inquiry',
        'quoted',
        'confirmed',
        'in_preparation',
        'delivered',
        'completed',
        'cancelled',
      ],
      default: 'inquiry',
      index: true,
    },
    quotationRef: { type: Schema.Types.ObjectId, ref: 'Quotation' },
    orderRef: { type: Schema.Types.ObjectId, ref: 'Order' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICateringOrder>('CateringOrder', CateringOrderSchema);
