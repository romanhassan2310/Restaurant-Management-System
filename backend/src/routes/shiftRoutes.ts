import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { closeShift, getOpenShift, getShiftSummary, listShifts, recordCashTransaction, startShift } from '../services/shiftService.js';

const router = Router();
router.use(requireAuth);

const openingSchema = z.object({ openingCash: z.number().min(0) });
const cashTransactionSchema = z.object({ type: z.enum(['cash_in', 'cash_out']), amount: z.number().positive(), notes: z.string().optional() });
const closeSchema = z.object({ actualCash: z.number().min(0), notes: z.string().optional() });

function userId(req: AuthenticatedRequest) {
  return req.user!.id;
}

router.post('/start', requirePermission('shift.manage'), validateBody(openingSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await startShift(userId(req), req.body.openingCash) }); } catch (error) { next(error); }
});
router.get('/current', requirePermission('shift.view'), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await getOpenShift(userId(req)) }); } catch (error) { next(error); }
});
router.get('/', requirePermission('shift.view'), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await listShifts(userId(req)) }); } catch (error) { next(error); }
});
router.get('/:id/summary', requirePermission('shift.view'), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await getShiftSummary(String(req.params.id), userId(req)) }); } catch (error) { next(error); }
});
router.post('/:id/cash', requirePermission('shift.manage'), validateBody(cashTransactionSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await recordCashTransaction(String(req.params.id), userId(req), req.body.type, req.body.amount, req.body.notes) }); } catch (error) { next(error); }
});
router.post('/:id/close', requirePermission('shift.close'), validateBody(closeSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await closeShift(String(req.params.id), userId(req), req.body.actualCash, req.body.notes) }); } catch (error) { next(error); }
});

export default router;
