import mongoose, { type ClientSession } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { CashReconciliation } from '../models/CashReconciliation.js';
import { Shift } from '../models/Shift.js';
import { ShiftTransaction } from '../models/ShiftTransaction.js';

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function audit(action: string, entity: string, entityId: string, userId?: string, amount?: number, session?: ClientSession, after?: Record<string, unknown>) {
  await AuditLog.create([{
    user: userId,
    action,
    module: 'cash',
    entity,
    entityId,
    after,
    ...(amount === undefined ? {} : { before: { amount } }),
  }], { session });
}

export async function startShift(userId: string, openingCash: number) {
  if (!Number.isFinite(openingCash) || openingCash < 0) throw new AppError('Opening cash must be zero or greater', 400);
  const existing = await Shift.findOne({ user: userId, status: 'open' });
  if (existing) throw new AppError('An open shift already exists for this user', 409);
  const shift = await Shift.create({ user: userId, openingCash, expectedCash: openingCash });
  await audit('shift_started', 'Shift', String(shift._id), userId, openingCash, undefined, { openingCash });
  return shift;
}

export async function getOpenShift(userId: string) {
  return Shift.findOne({ user: userId, status: 'open' }).lean();
}

export async function getShiftSummary(shiftId: string, userId?: string, session?: ClientSession) {
  const shift = await Shift.findById(shiftId).session(session ?? null).lean();
  if (!shift) throw new AppError('Shift not found', 404);
  if (userId && String(shift.user) !== userId) throw new AppError('Shift access denied', 403);
  const transactions = await ShiftTransaction.find({ shift: shiftId }).session(session ?? null).sort({ createdAt: -1 }).lean();
  const paymentTotal = money(transactions.filter((item) => item.type === 'payment').reduce((sum, item) => sum + item.amount, 0));
  const refundTotal = money(transactions.filter((item) => item.type === 'refund').reduce((sum, item) => sum + item.amount, 0));
  const cashIn = money(transactions.filter((item) => item.type === 'cash_in').reduce((sum, item) => sum + item.amount, 0));
  const cashOut = money(transactions.filter((item) => item.type === 'cash_out').reduce((sum, item) => sum + item.amount, 0));
  const cashPayments = money(transactions.filter((item) => item.type === 'payment' && item.method === 'cash').reduce((sum, item) => sum + item.amount, 0));
  const cashRefunds = money(transactions.filter((item) => item.type === 'refund' && item.method === 'cash').reduce((sum, item) => sum + item.amount, 0));
  const expectedCash = money(shift.openingCash + cashPayments + cashIn - cashOut - cashRefunds);
  return { shift, transactions, totals: { paymentTotal, refundTotal, cashIn, cashOut, cashPayments, cashRefunds, expectedCash } };
}

export async function recordCashTransaction(shiftId: string, userId: string, type: 'cash_in' | 'cash_out', amount: number, notes?: string) {
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError('Cash amount must be greater than zero', 400);
  const shift = await Shift.findOne({ _id: shiftId, user: userId, status: 'open' });
  if (!shift) throw new AppError('Open shift not found', 404);
  const [transaction] = await ShiftTransaction.create([{ shift: shift._id, type, amount, method: 'cash', notes, createdBy: userId }]);
  const summary = await getShiftSummary(String(shift._id), userId);
  shift.expectedCash = summary.totals.expectedCash;
  await shift.save();
  await audit(type, 'ShiftTransaction', String(transaction._id), userId, amount, undefined, { shift: String(shift._id), type });
  return transaction;
}

export async function closeShift(shiftId: string, userId: string, actualCash: number, notes?: string) {
  if (!Number.isFinite(actualCash) || actualCash < 0) throw new AppError('Actual cash must be zero or greater', 400);
  const session = await mongoose.startSession();
  try {
    let result!: { shift: unknown; reconciliation: unknown; summary: unknown };
    await session.withTransaction(async () => {
      const shift = await Shift.findOne({ _id: shiftId, user: userId, status: 'open' }).session(session);
      if (!shift) throw new AppError('Open shift not found', 404);
      const summary = await getShiftSummary(String(shift._id), userId, session);
      const expectedCash = summary.totals.expectedCash;
      const difference = money(actualCash - expectedCash);
      shift.expectedCash = expectedCash;
      shift.actualCash = actualCash;
      shift.cashDifference = difference;
      shift.status = 'closed';
      shift.closedAt = new Date();
      shift.closingNotes = notes;
      await shift.save({ session });
      const [reconciliation] = await CashReconciliation.create([{ shift: shift._id, expectedCash, actualCash, difference, notes, reconciledBy: userId }], { session });
      await AuditLog.create([{
        user: userId,
        action: 'shift_closed',
        module: 'cash',
        entity: 'Shift',
        entityId: String(shift._id),
        before: { expectedCash },
        after: { actualCash, difference },
      }], { session });
      result = { shift, reconciliation, summary };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function listShifts(userId?: string) {
  return Shift.find(userId ? { user: userId } : {}).sort({ openedAt: -1 }).limit(100).lean();
}
