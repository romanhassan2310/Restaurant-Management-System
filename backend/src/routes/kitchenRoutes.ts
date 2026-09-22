import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { getKitchenOrder, listKitchenOrders, setKitchenPriority, updateKitchenStatus } from '../services/kitchenService.js';

const router = Router();
router.use(requireAuth);

const statusSchema = z.object({ status: z.enum(['new', 'pending', 'preparing', 'ready', 'served', 'completed', 'cancelled']), priority: z.number().int().min(0).max(100).optional() });
const prioritySchema = z.object({ priority: z.number().int().min(0).max(100) });

function userId(req: AuthenticatedRequest): string {
  return req.user!.id;
}

router.get('/orders', requirePermission('kitchen.view'), async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status as Parameters<typeof listKitchenOrders>[0] : undefined;
    res.json({ success: true, data: await listKitchenOrders(status) });
  } catch (error) { next(error); }
});
router.get('/orders/:id', requirePermission('kitchen.view'), async (req, res, next) => {
  try { res.json({ success: true, data: await getKitchenOrder(String(req.params.id)) }); } catch (error) { next(error); }
});
router.patch('/orders/:id/status', requirePermission('kitchen.manage'), validateBody(statusSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await updateKitchenStatus(String(req.params.id), req.body.status, userId(req), req.body.priority) }); } catch (error) { next(error); }
});
router.patch('/orders/:id/priority', requirePermission('kitchen.manage'), validateBody(prioritySchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await setKitchenPriority(String(req.params.id), req.body.priority, userId(req)) }); } catch (error) { next(error); }
});

export default router;
