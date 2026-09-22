import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type OrderType = 'dine_in' | 'take_away' | 'delivery' | 'mobile_van';
export type OrderStatus = 'held' | 'open' | 'completed' | 'voided' | 'refunded';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded' | 'partially_refunded';
export type OrderSource = 'pos' | 'qr' | 'waiter';

export interface IOrderModifierSnapshot {
  modifier: Types.ObjectId;
  name: string;
  price: number;
}

export interface IOrderItem {
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  modifiers: IOrderModifierSnapshot[];
  notes?: string;
  lineTotal: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  type: OrderType;
  source: OrderSource;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: IOrderItem[];
  customer?: Types.ObjectId;
  table?: Types.ObjectId;
  waiter?: Types.ObjectId;
  guestCount?: number;
  notes?: string;
  discountType?: 'fixed' | 'percentage';
  discountValue: number;
  taxRate: number;
  serviceChargeRate: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceChargeTotal: number;
  total: number;
  voidReason?: string;
  refundReason?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const modifierSnapshotSchema = new Schema<IOrderModifierSnapshot>({
  modifier: { type: Schema.Types.ObjectId, ref: 'Modifier', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  unitPrice: { type: Number, required: true, min: 0 },
  modifiers: { type: [modifierSnapshotSchema], default: [] },
  notes: { type: String, trim: true },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['dine_in', 'take_away', 'delivery', 'mobile_van'], required: true },
  source: { type: String, enum: ['pos', 'qr', 'waiter'], default: 'pos' },
  status: { type: String, enum: ['held', 'open', 'completed', 'voided', 'refunded'], default: 'open' },
  paymentStatus: { type: String, enum: ['unpaid', 'partially_paid', 'paid', 'refunded', 'partially_refunded'], default: 'unpaid' },
  items: { type: [orderItemSchema], required: true, validate: [(items: IOrderItem[]) => items.length > 0, 'Order requires at least one item'] },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  table: { type: Schema.Types.ObjectId, ref: 'RestaurantTable' },
  waiter: { type: Schema.Types.ObjectId, ref: 'User' },
  guestCount: { type: Number, min: 1 },
  notes: { type: String, trim: true },
  discountType: { type: String, enum: ['fixed', 'percentage'] },
  discountValue: { type: Number, min: 0, default: 0 },
  taxRate: { type: Number, min: 0, default: 0 },
  serviceChargeRate: { type: Number, min: 0, default: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  discountTotal: { type: Number, required: true, min: 0 },
  taxTotal: { type: Number, required: true, min: 0 },
  serviceChargeTotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  voidReason: { type: String, trim: true },
  refundReason: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
