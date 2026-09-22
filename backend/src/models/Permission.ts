import mongoose, { Schema, type Document } from 'mongoose';

export interface IPermission extends Document {
  key: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Permission = mongoose.model<IPermission>('Permission', permissionSchema);
