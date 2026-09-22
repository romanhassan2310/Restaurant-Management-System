import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IRole extends Document {
  name: string;
  code: string;
  description?: string;
  permissions: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Role = mongoose.model<IRole>('Role', roleSchema);
