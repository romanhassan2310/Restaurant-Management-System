import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  roles: Types.ObjectId[];
  branchIds: Types.ObjectId[];
  isActive: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpiresAt: { type: Date },
    refreshTokenHash: { type: String },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', userSchema);
