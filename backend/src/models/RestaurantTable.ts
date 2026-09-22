import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type TableStatus = 'available' | 'reserved' | 'occupied' | 'cleaning' | 'inactive';

export interface IRestaurantTable extends Document {
  name: string;
  capacity: number;
  floor?: Types.ObjectId;
  status: TableStatus;
  section?: string;
  guestCount: number;
  assignedWaiter?: Types.ObjectId;
  currentOrder?: Types.ObjectId;
  qrToken?: string;
  qrEnabled: boolean;
  isActive: boolean;
}

const restaurantTableSchema = new Schema<IRestaurantTable>({
  name: { type: String, required: true, unique: true, trim: true },
  capacity: { type: Number, required: true, min: 1 },
    floor: { type: Schema.Types.ObjectId, ref: 'Floor' },
  status: { type: String, enum: ['available', 'reserved', 'occupied', 'cleaning', 'inactive'], default: 'available' },
  section: { type: String, trim: true },
  guestCount: { type: Number, min: 0, default: 0 },
  assignedWaiter: { type: Schema.Types.ObjectId, ref: 'User' },
  currentOrder: { type: Schema.Types.ObjectId, ref: 'Order' },
  qrToken: { type: String, unique: true, sparse: true, select: false },
  qrEnabled: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const RestaurantTable = mongoose.model<IRestaurantTable>('RestaurantTable', restaurantTableSchema);
