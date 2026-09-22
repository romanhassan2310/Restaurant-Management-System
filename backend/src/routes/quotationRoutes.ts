import { Router } from 'express';
import quotationController from '../controllers/quotationController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission('quotation.manage'), (req, res) => quotationController.createQuotation(req as any, res));
router.get('/', requirePermission('quotation.view'), (req, res) => quotationController.getQuotations(req as any, res));
router.get('/:id', requirePermission('quotation.view'), (req, res) => quotationController.getQuotationById(req as any, res));
router.patch('/:id/status', requirePermission('quotation.manage'), (req, res) => quotationController.updateQuotationStatus(req as any, res));
router.post('/:id/convert', requirePermission('quotation.manage'), (req, res) => quotationController.convertToOrder(req as any, res));

export default router;
