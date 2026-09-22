import mongoose, { Schema, type Document } from 'mongoose';

export interface IUnit extends Document {
  name: string;
  code: string;
  precision: number;
  isActive: boolean;
}

const unitSchema = new Schema<IUnit>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, lowercase: true, trim: true },
  precision: { type: Number, default: 3, min: 0, max: 6 },
  isActive: { type: Boolean, default: true },
});

export const Unit = mongoose.model<IUnit>('Unit', unitSchema);
