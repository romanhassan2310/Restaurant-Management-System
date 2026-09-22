import mongoose, { type ClientSession } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { Customer } from '../models/Customer.js';
import { Invoice } from '../models/Invoice.js';
import { Order, type IOrder } from '../models/Order.js';
import { Payment, type PaymentMethod } from '../models/Payment.js';
import { PaymentAudit } from '../models/PaymentAudit.js';
import { Receipt } from '../models/Receipt.js';
import { ReceiptTemplate } from '../models/ReceiptTemplate.js';
import { Shift } from '../models/Shift.js';
import { ShiftTransaction } from '../models/ShiftTransaction.js';
import { restoreSale } from './inventoryService.js';
import { getShiftSummary } from './shiftService.js';
import { crmService } from './crmService.js';
import { giftCardService } from './giftCardService.js';
import { loyaltyService } from './loyaltyService.js';

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  groupType?: 'single' | 'split' | 'mixed';
  reference?: string;
  notes?: string;
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function receiptNumber(): string {
  return `RCT-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

function invoiceNumber(): string {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

async function auditPayment(action: string, entity: string, entityId: string, userId: string, input: { amount?: number; method?: string; before?: Record<string, unknown>; after?: Record<string, unknown> }, session?: ClientSession) {
  await PaymentAudit.create([{
    action,
    entity,
    entityId,
    amount: input.amount,
    method: input.method,
    before: input.before,
    after: input.after,
    user: userId,
  }], { session });
  await AuditLog.create([{
    user: userId,
    action,
    module: 'payment',
    entity,
    entityId,
    before: input.before,
    after: input.after,
  }], { session });
}

async function currentPaidAmount(orderId: string, session?: ClientSession) {
  const payments = await Payment.find({ order: orderId, status: { $ne: 'voided' } }).session(session ?? null);
  return money(payments.reduce((sum, payment) => sum + payment.amount - payment.refundedAmount, 0));
}

async function issueDocuments(order: IOrder, paymentTotal: number, userId: string, session: ClientSession) {
  const receipt = await Receipt.findOneAndUpdate(
    { order: order._id },
    { $setOnInsert: { receiptNumber: receiptNumber(), order: order._id, total: order.total, issuedBy: userId } },
    { upsert: true, new: true, session },
  );
  const customer = order.customer ? await Customer.findById(order.customer).session(session) : null;
  const invoice = await Invoice.findOneAndUpdate(
    { order: order._id },
    {
      $setOnInsert: {
        invoiceNumber: invoiceNumber(),
        order: order._id,
        customer: order.customer,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        items: order.items.map((item) => ({ name: item.name, sku: item.sku, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal })),
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        taxTotal: order.taxTotal,
        serviceChargeTotal: order.serviceChargeTotal,
        total: order.total,
        issuedBy: userId,
      },
      $set: { paymentTotal },
    },
    { upsert: true, new: true, session },
  );
  return { receipt, invoice };
}

export async function recordPayments(orderId: string, inputs: PaymentInput[], userId: string) {
  if (!inputs.length) throw new AppError('At least one payment is required', 400);
  const session = await mongoose.startSession();
  try {
    let result!: { order: unknown; payments: unknown[]; receipt?: unknown; invoice?: unknown; paid: number; due: number };
    let customerToReward: { customerId: string; total: number; orderId: string } | null = null;

    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: orderId, status: { $in: ['open'] } }).session(session);
      if (!order) throw new AppError('Open order not found', 404);
      const shift = await Shift.findOne({ user: userId, status: 'open' }).session(session);
      if (!shift) throw new AppError('An open POS shift is required to accept payment', 409);
      const paidBefore = await currentPaidAmount(orderId, session);
      const due = money(order.total - paidBefore);
      const requested = money(inputs.reduce((sum, input) => sum + input.amount, 0));
      if (inputs.some((input) => !Number.isFinite(input.amount) || input.amount <= 0)) throw new AppError('Payment amounts must be greater than zero', 400);
      if (requested > due) throw new AppError(`Payment exceeds remaining balance of ${due.toFixed(2)}`, 400);

      const payments = [];
      for (const input of inputs) {
        if (input.method === 'store_credit') {
          if (!order.customer) throw new AppError('Customer must be attached to order to use store credit', 400);
          await crmService.adjustCustomerCredit(
            String(order.customer),
            input.amount,
            'order_payment',
            `POS Order ${order.orderNumber} payment`,
            userId,
            String(order._id)
          );
        } else if (input.method === 'gift_card') {
          if (!input.reference) throw new AppError('Gift card code is required in reference field', 400);
          await giftCardService.redeemGiftCard(
            input.reference,
            input.amount,
            String(order._id),
            undefined,
            userId
          );
        }

        const groupType = inputs.length > 1 ? (inputs.every((item) => item.method === inputs[0].method) ? 'split' : 'mixed') : (input.groupType ?? 'single');
        const [payment] = await Payment.create([{ order: order._id, shift: shift._id, method: input.method, groupType, amount: money(input.amount), reference: input.reference, notes: input.notes, receivedBy: userId }], { session });
        payments.push(payment);
        await ShiftTransaction.create([{ shift: shift._id, type: 'payment', amount: money(input.amount), method: input.method, order: order._id, payment: payment._id, notes: input.notes, createdBy: userId }], { session });
        await auditPayment('payment_received', 'Payment', String(payment._id), userId, { amount: input.amount, method: input.method, after: { order: orderId, shift: String(shift._id) } }, session);
      }

      const paid = money(paidBefore + requested);
      const fullyPaid = paid >= order.total;
      order.paymentStatus = fullyPaid ? 'paid' : 'partially_paid';
      if (fullyPaid) {
        order.status = 'completed';
        if (order.customer) {
          customerToReward = { customerId: String(order.customer), total: order.total, orderId: String(order._id) };
        }
      }
      await order.save({ session });
      let documents: { receipt?: unknown; invoice?: unknown } = {};
      if (fullyPaid) documents = await issueDocuments(order, paid, userId, session);
      const shiftSummary = await getShiftSummary(String(shift._id), userId, session);
      shift.expectedCash = shiftSummary.totals.expectedCash;
      await shift.save({ session });
      result = { order, payments, ...documents, paid, due: money(order.total - paid) };
    });

    if (customerToReward) {
      await loyaltyService.awardPoints(customerToReward.customerId, customerToReward.total, customerToReward.orderId);
    }

    return result;
  } finally {
    await session.endSession();
  }
}

export async function refundPayment(orderId: string, amount: number, reason: string, userId: string) {
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError('Refund amount must be greater than zero', 400);
  const session = await mongoose.startSession();
  try {
    let result!: { order: unknown; refunded: number; remaining: number };
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: orderId, status: { $in: ['completed', 'open'] } }).session(session);
      if (!order) throw new AppError('Refundable order not found', 404);
      const shift = await Shift.findOne({ user: userId, status: 'open' }).session(session);
      if (!shift) throw new AppError('An open POS shift is required to process a refund', 409);
      const payments = await Payment.find({ order: order._id, status: { $in: ['completed', 'partially_refunded'] } }).sort({ createdAt: 1 }).session(session);
      const refundable = money(payments.reduce((sum, payment) => sum + payment.amount - payment.refundedAmount, 0));
      if (amount > refundable) throw new AppError(`Refund exceeds refundable balance of ${refundable.toFixed(2)}`, 400);

      let remainingRefund = money(amount);
      for (const payment of payments) {
        if (remainingRefund <= 0) break;
        const available = money(payment.amount - payment.refundedAmount);
        const applied = Math.min(available, remainingRefund);
        payment.refundedAmount = money(payment.refundedAmount + applied);
        payment.status = payment.refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
        await payment.save({ session });
        await ShiftTransaction.create([{ shift: shift._id, type: 'refund', amount: applied, method: payment.method, order: order._id, payment: payment._id, notes: reason, createdBy: userId }], { session });
        await auditPayment('payment_refunded', 'Payment', String(payment._id), userId, { amount: applied, method: payment.method, before: { refundedAmount: payment.refundedAmount - applied }, after: { refundedAmount: payment.refundedAmount, reason } }, session);
        remainingRefund = money(remainingRefund - applied);
      }

      const ratio = amount / order.total;
      for (const item of order.items) {
        await restoreSale(String(item.product), item.quantity * ratio, userId, item.variant ? String(item.variant) : undefined, session);
      }
      const remaining = money(refundable - amount);
      order.paymentStatus = remaining === 0 ? 'refunded' : 'partially_refunded';
      if (remaining === 0) order.status = 'refunded';
      order.refundReason = reason;
      await order.save({ session });
      const summary = await getShiftSummary(String(shift._id), userId, session);
      shift.expectedCash = summary.totals.expectedCash;
      await shift.save({ session });
      result = { order, refunded: amount, remaining };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function listPayments(orderId?: string) {
  return Payment.find(orderId ? { order: orderId } : {}).populate('order shift').sort({ createdAt: -1 }).limit(200).lean();
}

export async function listReceipts() {
  return Receipt.find({}).populate('order').sort({ issuedAt: -1 }).limit(200).lean();
}

export async function printReceipt(receiptId: string, userId: string) {
  const receipt = await Receipt.findByIdAndUpdate(receiptId, { $inc: { printCount: 1 }, lastPrintedAt: new Date() }, { new: true }).populate({ path: 'order', populate: { path: 'customer' } });
  if (!receipt) throw new AppError('Receipt not found', 404);
  await auditPayment('receipt_printed', 'Receipt', receiptId, userId, { after: { printCount: receipt.printCount } });
  return receipt;
}

export async function listInvoices() {
  return Invoice.find({}).populate('order customer').sort({ issuedAt: -1 }).limit(100).lean();
}

export async function getReceiptTemplate() {
  return ReceiptTemplate.findOne({ isDefault: true }).sort({ updatedAt: -1 }).lean();
}

export async function saveReceiptTemplate(input: { name: string; header: string; footer: string; showCustomer: boolean; showTax: boolean; showPayment: boolean }, userId: string) {
  await ReceiptTemplate.updateMany({}, { isDefault: false });
  const template = await ReceiptTemplate.create({ ...input, isDefault: true, updatedBy: userId });
  await auditPayment('receipt_template_updated', 'ReceiptTemplate', String(template._id), userId, { after: input });
  return template;
}
