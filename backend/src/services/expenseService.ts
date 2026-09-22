import Expense, { IExpense } from '../models/Expense.js';
import { AuditLog } from '../models/AuditLog.js';

export interface CreateExpenseDTO {
  category: string;
  amount: number;
  date?: string;
  description: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other';
  vendor?: string;
  receiptAttachment?: string;
}

export class ExpenseService {
  async createExpense(dto: CreateExpenseDTO, createdById?: string): Promise<IExpense> {
    const expense = new Expense({
      category: dto.category,
      amount: dto.amount,
      date: dto.date ? new Date(dto.date) : new Date(),
      description: dto.description,
      paymentMethod: dto.paymentMethod,
      vendor: dto.vendor,
      receiptAttachment: dto.receiptAttachment,
      approvalStatus: 'pending',
      createdById,
    });

    await expense.save();

    await AuditLog.create({
      user: createdById,
      action: 'EXPENSE_CREATED',
      module: 'expense',
      entity: 'Expense',
      entityId: expense._id.toString(),
      after: { category: expense.category, amount: expense.amount, vendor: expense.vendor },
    });

    return expense;
  }

  async getExpenses(filters: {
    category?: string;
    approvalStatus?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<IExpense[]> {
    const query: any = {};
    if (filters.category) query.category = filters.category;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    return Expense.find(query).populate('approvedBy', 'name email').sort({ date: -1 });
  }

  async approveExpense(expenseId: string, approvedBy: string): Promise<IExpense> {
    const expense = await Expense.findById(expenseId);
    if (!expense) throw new Error('Expense record not found');
    if (expense.approvalStatus !== 'pending') {
      throw new Error(`Cannot approve expense in '${expense.approvalStatus}' status`);
    }

    expense.approvalStatus = 'approved';
    expense.approvedBy = approvedBy as any;
    expense.approvalDate = new Date();
    await expense.save();

    await AuditLog.create({
      user: approvedBy,
      action: 'EXPENSE_APPROVED',
      module: 'expense',
      entity: 'Expense',
      entityId: expense._id.toString(),
      after: { amount: expense.amount, category: expense.category },
    });

    return expense;
  }

  async rejectExpense(expenseId: string, rejectedBy: string, reason: string): Promise<IExpense> {
    const expense = await Expense.findById(expenseId);
    if (!expense) throw new Error('Expense record not found');
    if (expense.approvalStatus !== 'pending') {
      throw new Error(`Cannot reject expense in '${expense.approvalStatus}' status`);
    }

    expense.approvalStatus = 'rejected';
    expense.approvedBy = rejectedBy as any;
    expense.approvalDate = new Date();
    expense.rejectionReason = reason;
    await expense.save();

    await AuditLog.create({
      user: rejectedBy,
      action: 'EXPENSE_REJECTED',
      module: 'expense',
      entity: 'Expense',
      entityId: expense._id.toString(),
      after: { reason, amount: expense.amount },
    });

    return expense;
  }

  async getExpenseSummary(): Promise<any> {
    const summary = await Expense.aggregate([
      { $match: { approvalStatus: 'approved' } },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const totalApproved = await Expense.aggregate([
      { $match: { approvalStatus: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalPending = await Expense.aggregate([
      { $match: { approvalStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
      byCategory: summary,
      totalApproved: totalApproved[0]?.total || 0,
      totalPending: totalPending[0]?.total || 0,
    };
  }
}

export default new ExpenseService();
