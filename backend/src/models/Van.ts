import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type VanStatus = 'active' | 'maintenance' | 'inactive';

export interface IVan extends Document {
  vanNumber: string;
  plateNumber: string;
  modelName?: string;
  driver?: Types.ObjectId;
  assignedSalesperson?: Types.ObjectId;
  status: VanStatus;
  capacity?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vanSchema = new Schema<IVan>(
  {
    vanNumber: { type: String, required: true, unique: true, trim: true },
    plateNumber: { type: String, required: true, unique: true, trim: true },
    modelName: { type: String, trim: true },
    driver: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedSalesperson: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
    capacity: { type: Number, min: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Van = mongoose.model<IVan>('Van', vanSchema);
