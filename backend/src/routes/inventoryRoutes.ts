import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Recipe } from '../models/Recipe.js';
import { Unit } from '../models/Unit.js';
import {
  createInventoryAudit,
  createStockMovement,
  getInventoryValuation,
  getLowStockProducts,
  listStockMovements,
  recordAdjustment,
  recordPurchase,
  recordReturn,
  recordSale,
  recordTransfer,
  recordWastage,
} from '../services/inventoryService.js';

const router = Router();
router.use(requireAuth);

const idSchema = z.string().min(1);
const categorySchema = z.object({ name: z.string().min(2), code: z.string().min(2), description: z.string().optional(), parentCategory: idSchema.optional() });
const unitSchema = z.object({ name: z.string().min(1), code: z.string().min(1), precision: z.number().int().min(0).max(6).optional() });
const productSchema = z.object({
  name: z.string().min(2), sku: z.string().min(2), barcode: z.string().optional(), category: idSchema, unit: idSchema,
  type: z.enum(['raw_material', 'packaging', 'ingredient', 'prepared', 'retail']), description: z.string().optional(),
  costPrice: z.number().min(0).optional(), sellingPrice: z.number().min(0).optional(),
  minimumStock: z.number().min(0).optional(), reorderLevel: z.number().min(0).optional(), trackInventory: z.boolean().optional(),
});
const variantSchema = z.object({ product: idSchema, name: z.string().min(1), sku: z.string().min(2), barcode: z.string().optional(), unit: idSchema, costPrice: z.number().min(0).optional(), sellingPrice: z.number().min(0).optional(), minimumStock: z.number().min(0).optional(), reorderLevel: z.number().min(0).optional() });
const recipeSchema = z.object({ product: idSchema, yieldQuantity: z.number().positive(), yieldUnit: idSchema, items: z.array(z.object({ product: idSchema, quantity: z.number().positive(), unit: idSchema })).min(1) });
const movementSchema = z.object({ productId: idSchema, variantId: idSchema.optional(), delta: z.number().refine((value) => value !== 0), type: z.enum(['purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'wastage', 'return_in', 'return_out']), notes: z.string().optional() });
const adjustmentSchema = z.object({ items: z.array(z.object({ product: idSchema, variant: idSchema.optional(), quantity: z.number().refine((value) => value !== 0), reason: z.string().min(1) })).min(1), notes: z.string().optional() });
const transferSchema = z.object({ fromLocation: z.string().min(1), toLocation: z.string().min(1), items: z.array(z.object({ product: idSchema, variant: idSchema.optional(), quantity: z.number().positive() })).min(1), notes: z.string().optional() });
const quantitySchema = z.object({ productId: idSchema, variantId: idSchema.optional(), quantity: z.number().positive(), notes: z.string().optional() });
const returnSchema = quantitySchema.extend({ direction: z.enum(['in', 'out']) });
const auditSchema = z.object({ productId: idSchema, variantId: idSchema.optional(), countedQuantity: z.number().min(0), notes: z.string().optional() });

function userId(req: AuthenticatedRequest) {
  return req.user?.id;
}

router.get('/categories', requirePermission('inventory.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await Category.find({}).sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});
router.post('/categories', requirePermission('inventory.manage'), validateBody(categorySchema), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await Category.create(req.body) }); } catch (error) { next(error); }
});
router.patch('/categories/:id', requirePermission('inventory.manage'), validateBody(categorySchema.partial()), async (req, res, next) => {
  try { const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!category) throw new AppError('Category not found', 404); res.json({ success: true, data: category }); } catch (error) { next(error); }
});
router.delete('/categories/:id', requirePermission('inventory.manage'), async (req, res, next) => {
  try { const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }); if (!category) throw new AppError('Category not found', 404); res.json({ success: true, data: category }); } catch (error) { next(error); }
});

router.get('/units', requirePermission('inventory.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await Unit.find({}).sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});
router.post('/units', requirePermission('inventory.manage'), validateBody(unitSchema), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await Unit.create(req.body) }); } catch (error) { next(error); }
});
router.patch('/units/:id', requirePermission('inventory.manage'), validateBody(unitSchema.partial()), async (req, res, next) => {
  try { const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!unit) throw new AppError('Unit not found', 404); res.json({ success: true, data: unit }); } catch (error) { next(error); }
});
router.delete('/units/:id', requirePermission('inventory.manage'), async (req, res, next) => {
  try { const unit = await Unit.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }); if (!unit) throw new AppError('Unit not found', 404); res.json({ success: true, data: unit }); } catch (error) { next(error); }
});

router.get('/products', requirePermission('inventory.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await Product.find({}).populate('category unit').sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});
router.post('/products', requirePermission('inventory.manage'), validateBody(productSchema), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await Product.create(req.body) }); } catch (error) { next(error); }
});
router.patch('/products/:id', requirePermission('inventory.manage'), validateBody(productSchema.partial()), async (req, res, next) => {
  try { const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!product) throw new AppError('Product not found', 404); res.json({ success: true, data: product }); } catch (error) { next(error); }
});
router.delete('/products/:id', requirePermission('inventory.manage'), async (req, res, next) => {
  try { const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }); if (!product) throw new AppError('Product not found', 404); res.json({ success: true, data: product }); } catch (error) { next(error); }
});

router.get('/variants', requirePermission('inventory.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await ProductVariant.find({}).populate('product unit').sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});
router.post('/variants', requirePermission('inventory.manage'), validateBody(variantSchema), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await ProductVariant.create(req.body) }); } catch (error) { next(error); }
});
router.patch('/variants/:id', requirePermission('inventory.manage'), validateBody(variantSchema.partial()), async (req, res, next) => {
  try { const variant = await ProductVariant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!variant) throw new AppError('Variant not found', 404); res.json({ success: true, data: variant }); } catch (error) { next(error); }
});
router.delete('/variants/:id', requirePermission('inventory.manage'), async (req, res, next) => {
  try { const variant = await ProductVariant.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }); if (!variant) throw new AppError('Variant not found', 404); res.json({ success: true, data: variant }); } catch (error) { next(error); }
});

router.get('/recipes', requirePermission('inventory.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await Recipe.find({}).populate('product yieldUnit items.product items.unit').lean() }); } catch (error) { next(error); }
});
router.post('/recipes', requirePermission('inventory.manage'), validateBody(recipeSchema), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await Recipe.findOneAndUpdate({ product: req.body.product }, req.body, { new: true, upsert: true, runValidators: true }) }); } catch (error) { next(error); }
});
router.patch('/recipes/:id', requirePermission('inventory.manage'), validateBody(recipeSchema.partial()), async (req, res, next) => {
  try { const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!recipe) throw new AppError('Recipe not found', 404); res.json({ success: true, data: recipe }); } catch (error) { next(error); }
});
router.delete('/recipes/:id', requirePermission('inventory.manage'), async (req, res, next) => {
  try { const recipe = await Recipe.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }); if (!recipe) throw new AppError('Recipe not found', 404); res.json({ success: true, data: recipe }); } catch (error) { next(error); }
});

router.post('/movements', requirePermission('inventory.adjust'), validateBody(movementSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await createStockMovement({ ...req.body, performedBy: userId(req) }) }); } catch (error) { next(error); }
});
router.get('/movements', requirePermission('inventory.view'), async (req, res, next) => {
  try { res.json({ success: true, data: await listStockMovements(typeof req.query.productId === 'string' ? req.query.productId : undefined) }); } catch (error) { next(error); }
});
router.post('/purchase', requirePermission('inventory.adjust'), validateBody(quantitySchema.extend({ costPrice: z.number().min(0).optional() })), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await recordPurchase(req.body.productId, req.body.quantity, req.body.costPrice, userId(req), req.body.variantId) }); } catch (error) { next(error); }
});
router.post('/sale', requirePermission('inventory.adjust'), validateBody(quantitySchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await recordSale(req.body.productId, req.body.quantity, userId(req), req.body.variantId) }); } catch (error) { next(error); }
});
router.post('/wastage', requirePermission('inventory.adjust'), validateBody(quantitySchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await recordWastage(req.body.productId, req.body.quantity, req.body.notes, userId(req), req.body.variantId) }); } catch (error) { next(error); }
});
router.post('/returns', requirePermission('inventory.adjust'), validateBody(returnSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await recordReturn(req.body.productId, req.body.quantity, req.body.direction, userId(req), req.body.variantId) }); } catch (error) { next(error); }
});
router.post('/adjustments', requirePermission('inventory.adjust'), validateBody(adjustmentSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await recordAdjustment(req.body.items, req.body.notes, userId(req)) }); } catch (error) { next(error); }
});
router.post('/transfers', requirePermission('inventory.transfer'), validateBody(transferSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await recordTransfer(req.body.fromLocation, req.body.toLocation, req.body.items, req.body.notes, userId(req)) }); } catch (error) { next(error); }
});
router.post('/audits', requirePermission('inventory.audit'), validateBody(auditSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await createInventoryAudit(req.body.productId, req.body.countedQuantity, req.body.variantId, req.body.notes, userId(req)) }); } catch (error) { next(error); }
});
router.get('/low-stock', requirePermission('inventory.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await getLowStockProducts() }); } catch (error) { next(error); }
});
router.get('/valuation', requirePermission('inventory.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await getInventoryValuation() }); } catch (error) { next(error); }
});

export default router;
