import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import expenseService from '../services/expenseService.js';

export class ExpenseController {
  async createExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const expense = await expenseService.createExpense(req.body, req.user?.id);
      res.status(201).json({ success: true, data: expense });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getExpenses(req: AuthenticatedRequest, res: Response) {
    try {
      const filters = {
        category: req.query.category as string,
        approvalStatus: req.query.approvalStatus as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };
      const expenses = await expenseService.getExpenses(filters);
      res.json({ success: true, data: expenses });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async approveExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const expense = await expenseService.approveExpense(id, req.user?.id || 'system');
      res.json({ success: true, data: expense });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async rejectExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const expense = await expenseService.rejectExpense(id, req.user?.id || 'system', reason || 'Rejected by manager');
      res.json({ success: true, data: expense });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getExpenseSummary(_req: AuthenticatedRequest, res: Response) {
    try {
      const summary = await expenseService.getExpenseSummary();
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export default new ExpenseController();
