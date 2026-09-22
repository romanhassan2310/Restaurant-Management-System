import { Router } from 'express';
import cateringController from '../controllers/cateringController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission('catering.manage'), (req, res) => cateringController.createCateringOrder(req as any, res));
router.get('/', requirePermission('catering.view'), (req, res) => cateringController.getCateringOrders(req as any, res));
router.get('/:id', requirePermission('catering.view'), (req, res) => cateringController.getCateringOrderById(req as any, res));
router.patch('/:id/status', requirePermission('catering.manage'), (req, res) => cateringController.updateCateringStatus(req as any, res));
router.post('/:id/payments', requirePermission('catering.manage'), (req, res) => cateringController.recordPayment(req as any, res));

export default router;
