import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IRecipeItem {
  product: Types.ObjectId;
  quantity: number;
  unit: Types.ObjectId;
}

export interface IRecipe extends Document {
  product: Types.ObjectId;
  yieldQuantity: number;
  yieldUnit: Types.ObjectId;
  items: IRecipeItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const recipeItemSchema = new Schema<IRecipeItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
  },
  { _id: false },
);

const recipeSchema = new Schema<IRecipe>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    yieldQuantity: { type: Number, required: true, min: 0.000001 },
    yieldUnit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    items: { type: [recipeItemSchema], required: true, validate: [(items: IRecipeItem[]) => items.length > 0, 'Recipe requires at least one item'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Recipe = mongoose.model<IRecipe>('Recipe', recipeSchema);
