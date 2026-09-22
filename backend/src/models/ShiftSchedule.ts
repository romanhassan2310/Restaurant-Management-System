import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ShiftType = 'morning' | 'evening' | 'night' | 'split' | 'custom';

export interface IShiftSchedule extends Document {
  employee: Types.ObjectId;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g., "08:00")
  endTime: string; // HH:mm (e.g., "16:00")
  shiftType: ShiftType;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const shiftScheduleSchema = new Schema<IShiftSchedule>({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: String, required: true, trim: true },
  startTime: { type: String, required: true, trim: true },
  endTime: { type: String, required: true, trim: true },
  shiftType: { type: String, enum: ['morning', 'evening', 'night', 'split', 'custom'], default: 'morning' },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

shiftScheduleSchema.index({ employee: 1, date: 1 }, { unique: true });

export const ShiftSchedule = mongoose.model<IShiftSchedule>('ShiftSchedule', shiftScheduleSchema);
