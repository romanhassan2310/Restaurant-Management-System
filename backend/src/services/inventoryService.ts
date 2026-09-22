import { Types, type ClientSession } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { InventoryAudit } from '../models/InventoryAudit.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Recipe } from '../models/Recipe.js';
import { StockAdjustment } from '../models/StockAdjustment.js';
import { StockMovement, type StockMovementType } from '../models/StockMovement.js';
import { StockTransfer } from '../models/StockTransfer.js';

interface StockChange {
  productId: string;
  variantId?: string;
  delta: number;
  type: StockMovementType;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  fromLocation?: string;
  toLocation?: string;
  performedBy?: string;
}

function assertPositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError(`${field} must be greater than zero`, 400);
  }
}

async function applyStockChange(change: StockChange, session?: ClientSession) {
  const record = change.variantId
    ? await ProductVariant.findById(change.variantId).session(session ?? null)
    : await Product.findById(change.productId).session(session ?? null);

  if (!record) {
    throw new AppError('Stock item not found', 404);
  }

  const current = record.stockQuantity;
  const next = current + change.delta;
  if (next < 0) {
    throw new AppError(`Insufficient stock for ${change.productId}`, 409);
  }

  record.stockQuantity = next;
  await record.save({ session });

  const [movement] = await StockMovement.create([{
    product: change.productId,
    variant: change.variantId,
    type: change.type,
    quantity: change.delta,
    balanceAfter: next,
    referenceType: change.referenceType,
    referenceId: change.referenceId,
    notes: change.notes,
    fromLocation: change.fromLocation,
    toLocation: change.toLocation,
    performedBy: change.performedBy,
  }], { session });
  return movement;
}

export async function createStockMovement(change: StockChange, session?: ClientSession) {
  assertPositive(Math.abs(change.delta), 'quantity');
  return applyStockChange(change, session);
}

export async function recordPurchase(productId: string, quantity: number, costPrice?: number, userId?: string, variantId?: string, session?: ClientSession, referenceId?: string) {
  assertPositive(quantity, 'quantity');
  const product = variantId ? await ProductVariant.findById(variantId).session(session ?? null) : await Product.findById(productId).session(session ?? null);
  if (!product) throw new AppError('Stock item not found', 404);
  if (costPrice !== undefined) {
    if (costPrice < 0) throw new AppError('costPrice cannot be negative', 400);
    product.costPrice = costPrice;
    await product.save({ session });
  }
  return applyStockChange({ productId, variantId, delta: quantity, type: 'purchase', referenceType: 'GoodsReceipt', referenceId, performedBy: userId }, session);
}

export async function recordReturn(productId: string, quantity: number, direction: 'in' | 'out', userId?: string, variantId?: string) {
  assertPositive(quantity, 'quantity');
  return applyStockChange({ productId, variantId, delta: direction === 'in' ? quantity : -quantity, type: direction === 'in' ? 'return_in' : 'return_out', performedBy: userId });
}

export async function recordWastage(productId: string, quantity: number, notes?: string, userId?: string, variantId?: string) {
  assertPositive(quantity, 'quantity');
  return applyStockChange({ productId, variantId, delta: -quantity, type: 'wastage', notes, performedBy: userId });
}

export async function recordAdjustment(items: Array<{ product: string; variant?: string; quantity: number; reason: string }>, notes?: string, userId?: string) {
  const adjustment = await StockAdjustment.create({
    items: items.map((item) => ({ product: item.product, variant: item.variant, quantity: item.quantity, reason: item.reason })),
    notes,
    createdBy: userId,
  });

  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity === 0) {
      throw new AppError('Adjustment quantity cannot be zero', 400);
    }
    await applyStockChange({
      productId: item.product,
      variantId: item.variant,
      delta: item.quantity,
      type: 'adjustment',
      referenceType: 'StockAdjustment',
      referenceId: String(adjustment._id),
      notes: item.reason,
      performedBy: userId,
    });
  }

  return adjustment;
}

export async function recordTransfer(fromLocation: string, toLocation: string, items: Array<{ product: string; variant?: string; quantity: number }>, notes?: string, userId?: string) {
  if (fromLocation === toLocation) throw new AppError('Transfer locations must be different', 400);
  const transfer = await StockTransfer.create({ fromLocation, toLocation, items, notes, createdBy: userId });

  for (const item of items) {
    assertPositive(item.quantity, 'quantity');
    await applyStockChange({ productId: item.product, variantId: item.variant, delta: -item.quantity, type: 'transfer_out', referenceType: 'StockTransfer', referenceId: String(transfer._id), fromLocation, toLocation, performedBy: userId });
    await applyStockChange({ productId: item.product, variantId: item.variant, delta: item.quantity, type: 'transfer_in', referenceType: 'StockTransfer', referenceId: String(transfer._id), fromLocation, toLocation, performedBy: userId });
  }

  return transfer;
}

export async function recordSale(productId: string, quantity: number, userId?: string, variantId?: string, session?: ClientSession) {
  assertPositive(quantity, 'quantity');
  if (variantId) {
    return applyStockChange({ productId, variantId, delta: -quantity, type: 'sale', referenceType: 'Sale', performedBy: userId }, session);
  }
  const product = await Product.findById(productId).session(session ?? null);
  if (!product) throw new AppError('Product not found', 404);

  const recipe = await Recipe.findOne({ product: productId, isActive: true });
  if (!recipe) {
    return applyStockChange({ productId, delta: -quantity, type: 'sale', referenceType: 'Sale', performedBy: userId }, session);
  }

  const referenceId = new Types.ObjectId().toString();
  const movements = [];
  const multiplier = quantity / recipe.yieldQuantity;
  for (const item of recipe.items) {
    movements.push(await applyStockChange({
      productId: String(item.product),
      delta: -(item.quantity * multiplier),
      type: 'sale',
      referenceType: 'RecipeSale',
      referenceId,
      notes: `Consumed by recipe ${productId}`,
      performedBy: userId,
    }, session));
  }
  return movements;
}

export async function restoreSale(productId: string, quantity: number, userId?: string, variantId?: string, session?: ClientSession) {
  assertPositive(quantity, 'quantity');
  if (variantId) {
    return applyStockChange({ productId, variantId, delta: quantity, type: 'return_in', referenceType: 'OrderRefund', performedBy: userId }, session);
  }

  const product = await Product.findById(productId).session(session ?? null);
  if (!product) throw new AppError('Product not found', 404);
  const recipe = await Recipe.findOne({ product: productId, isActive: true }).session(session ?? null);
  if (!recipe) {
    return applyStockChange({ productId, delta: quantity, type: 'return_in', referenceType: 'OrderRefund', performedBy: userId }, session);
  }

  const movements = [];
  const multiplier = quantity / recipe.yieldQuantity;
  for (const item of recipe.items) {
    movements.push(await applyStockChange({
      productId: String(item.product),
      delta: item.quantity * multiplier,
      type: 'return_in',
      referenceType: 'OrderRefund',
      notes: `Restored by order refund ${productId}`,
      performedBy: userId,
    }, session));
  }
  return movements;
}

export async function createInventoryAudit(productId: string, countedQuantity: number, variantId?: string, notes?: string, userId?: string) {
  if (!Number.isFinite(countedQuantity) || countedQuantity < 0) throw new AppError('countedQuantity must be zero or greater', 400);
  const record = variantId ? await ProductVariant.findById(variantId) : await Product.findById(productId);
  if (!record) throw new AppError('Stock item not found', 404);
  return InventoryAudit.create({ product: productId, variant: variantId, expectedQuantity: record.stockQuantity, countedQuantity, variance: countedQuantity - record.stockQuantity, notes, auditedBy: userId });
}

export async function getLowStockProducts() {
  return Product.find({ isActive: true, $expr: { $lte: ['$stockQuantity', '$reorderLevel'] } }).populate('category unit').lean();
}

export async function getInventoryValuation() {
  const [products, variants] = await Promise.all([
    Product.aggregate([{ $match: { isActive: true } }, { $project: { value: { $multiply: ['$stockQuantity', '$costPrice'] } } }, { $group: { _id: null, totalValue: { $sum: '$value' } } }]),
    ProductVariant.aggregate([{ $match: { isActive: true } }, { $project: { value: { $multiply: ['$stockQuantity', '$costPrice'] } } }, { $group: { _id: null, totalValue: { $sum: '$value' } } }]),
  ]);
  return { totalValue: (products[0]?.totalValue ?? 0) + (variants[0]?.totalValue ?? 0) };
}

export async function listStockMovements(productId?: string) {
  return StockMovement.find(productId ? { product: productId } : {}).sort({ createdAt: -1 }).lean();
}
