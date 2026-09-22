import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IInventoryAudit extends Document {
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  expectedQuantity: number;
  countedQuantity: number;
  variance: number;
  notes?: string;
  auditedBy?: Types.ObjectId;
  createdAt: Date;
}

const inventoryAuditSchema = new Schema<IInventoryAudit>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
  expectedQuantity: { type: Number, required: true },
  countedQuantity: { type: Number, required: true, min: 0 },
  variance: { type: Number, required: true },
  notes: { type: String, trim: true },
  auditedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const InventoryAudit = mongoose.model<IInventoryAudit>('InventoryAudit', inventoryAuditSchema);
