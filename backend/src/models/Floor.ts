import mongoose, { Schema, type Document } from 'mongoose';

export interface IFloor extends Document {
  name: string;
  code: string;
  sections: string[];
  isActive: boolean;
}

const floorSchema = new Schema<IFloor>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  sections: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Floor = mongoose.model<IFloor>('Floor', floorSchema);
