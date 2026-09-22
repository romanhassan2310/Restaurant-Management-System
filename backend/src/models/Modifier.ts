import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IModifier extends Document {
  name: string;
  price: number;
  product?: Types.ObjectId;
  isActive: boolean;
}

const modifierSchema = new Schema<IModifier>({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

modifierSchema.index({ product: 1, isActive: 1 });

export const Modifier = mongoose.model<IModifier>('Modifier', modifierSchema);
