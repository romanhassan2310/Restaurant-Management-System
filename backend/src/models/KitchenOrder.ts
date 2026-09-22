import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type KitchenOrderStatus = 'new' | 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface IKitchenOrderItem {
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  name: string;
  quantity: number;
  modifiers: string[];
  notes?: string;
}

export interface IKitchenOrder extends Document {
  order: Types.ObjectId;
  orderNumber: string;
  orderType: string;
  status: KitchenOrderStatus;
  priority: number;
  items: IKitchenOrderItem[];
  customer?: Types.ObjectId;
  table?: Types.ObjectId;
  waiter?: Types.ObjectId;
  receivedAt: Date;
  startedAt?: Date;
  readyAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  preparationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const kitchenItemSchema = new Schema<IKitchenOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  modifiers: { type: [String], default: [] },
  notes: { type: String, trim: true },
}, { _id: false });

const kitchenOrderSchema = new Schema<IKitchenOrder>({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  orderNumber: { type: String, required: true },
  orderType: { type: String, required: true },
  status: { type: String, enum: ['new', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'], default: 'new' },
  priority: { type: Number, min: 0, max: 100, default: 50 },
  items: { type: [kitchenItemSchema], required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  table: { type: Schema.Types.ObjectId, ref: 'RestaurantTable' },
  waiter: { type: Schema.Types.ObjectId, ref: 'User' },
  receivedAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  readyAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  preparationSeconds: { type: Number, min: 0 },
}, { timestamps: true });

kitchenOrderSchema.index({ status: 1, priority: -1, receivedAt: 1 });
kitchenOrderSchema.index({ waiter: 1, updatedAt: -1 });

export const KitchenOrder = mongoose.model<IKitchenOrder>('KitchenOrder', kitchenOrderSchema);
