import { Router } from 'express';
import expenseController from '../controllers/expenseController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission('expense.manage'), (req, res) => expenseController.createExpense(req as any, res));
router.get('/', requirePermission('expense.view'), (req, res) => expenseController.getExpenses(req as any, res));
router.get('/summary', requirePermission('expense.view'), (req, res) => expenseController.getExpenseSummary(req as any, res));
router.post('/:id/approve', requirePermission('expense.manage'), (req, res) => expenseController.approveExpense(req as any, res));
router.post('/:id/reject', requirePermission('expense.manage'), (req, res) => expenseController.rejectExpense(req as any, res));

export default router;
