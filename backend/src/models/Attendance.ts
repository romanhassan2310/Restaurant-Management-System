import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type AttendanceStatus = 'present' | 'late' | 'early_leave' | 'absent' | 'half_day';

export interface IAttendance extends Document {
  employee: Types.ObjectId;
  date: string; // YYYY-MM-DD
  checkIn?: Date;
  checkOut?: Date;
  scheduledShift?: Types.ObjectId;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workHours: number;
  overtimeHours: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: String, required: true, trim: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  scheduledShift: { type: Schema.Types.ObjectId, ref: 'ShiftSchedule' },
  status: { type: String, enum: ['present', 'late', 'early_leave', 'absent', 'half_day'], default: 'present' },
  lateMinutes: { type: Number, default: 0, min: 0 },
  earlyLeaveMinutes: { type: Number, default: 0, min: 0 },
  workHours: { type: Number, default: 0, min: 0 },
  overtimeHours: { type: Number, default: 0, min: 0 },
  notes: { type: String, trim: true },
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
