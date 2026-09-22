import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  code: string;
  description?: string;
  parentCategory?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Category = mongoose.model<ICategory>('Category', categorySchema);
