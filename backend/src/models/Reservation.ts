import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export interface IReservation extends Document {
  customer: Types.ObjectId;
  date: Date;
  time: string;
  guestCount: number;
  table?: Types.ObjectId;
  status: ReservationStatus;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  guestCount: { type: Number, required: true, min: 1 },
  table: { type: Schema.Types.ObjectId, ref: 'RestaurantTable' },
  status: { type: String, enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'], default: 'pending' },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

reservationSchema.index({ date: 1, time: 1, status: 1 });
reservationSchema.index({ customer: 1, date: -1 });

export const Reservation = mongoose.model<IReservation>('Reservation', reservationSchema);
