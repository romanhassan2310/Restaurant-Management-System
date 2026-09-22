import { Router } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { Invoice } from '../models/Invoice.js';
import { Receipt } from '../models/Receipt.js';
import { listInvoices, listPayments, listReceipts, printReceipt, recordPayments, refundPayment, getReceiptTemplate, saveReceiptTemplate } from '../services/paymentService.js';

const router = Router();
router.use(requireAuth);

const paymentSchema = z.object({
  method: z.enum(['cash', 'card', 'qr', 'mobile_payment']),
  amount: z.number().positive(),
  groupType: z.enum(['single', 'split', 'mixed']).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
const paymentBatchSchema = z.object({ payments: z.array(paymentSchema).min(1) });
const refundSchema = z.object({ amount: z.number().positive(), reason: z.string().min(2) });
const templateSchema = z.object({ name: z.string().min(1), header: z.string(), footer: z.string(), showCustomer: z.boolean(), showTax: z.boolean(), showPayment: z.boolean() });

function userId(req: AuthenticatedRequest) {
  return req.user!.id;
}

router.post('/orders/:orderId/payments', requirePermission('payment.create'), validateBody(paymentBatchSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await recordPayments(String(req.params.orderId), req.body.payments, userId(req)) }); } catch (error) { next(error); }
});
router.post('/orders/:orderId/refunds', requirePermission('payment.refund'), validateBody(refundSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await refundPayment(String(req.params.orderId), req.body.amount, req.body.reason, userId(req)) }); } catch (error) { next(error); }
});
router.get('/', requirePermission('payment.view'), async (req, res, next) => {
  try { res.json({ success: true, data: await listPayments(typeof req.query.orderId === 'string' ? req.query.orderId : undefined) }); } catch (error) { next(error); }
});
router.get('/receipts', requirePermission('receipt.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await listReceipts() }); } catch (error) { next(error); }
});
router.post('/receipts/:id/print', requirePermission('receipt.print'), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await printReceipt(String(req.params.id), userId(req)) }); } catch (error) { next(error); }
});
router.get('/receipts/:id/pdf', requirePermission('receipt.print'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const receipt = await Receipt.findById(String(req.params.id)).populate({ path: 'order', populate: { path: 'customer' } }).lean();
    if (!receipt) throw new Error('Receipt not found');
    await printReceipt(String(req.params.id), userId(req));
    const document = new PDFDocument({ margin: 48 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${receipt.receiptNumber}.pdf"`);
    document.pipe(res);
    document.fontSize(20).text('Restaurant Management System', { align: 'center' });
    document.moveDown().fontSize(14).text(`Receipt ${receipt.receiptNumber}`);
    document.fontSize(10).text(`Order: ${(receipt.order as unknown as { orderNumber: string }).orderNumber}`);
    document.moveDown().fontSize(16).text(`Total: $${receipt.total.toFixed(2)}`, { align: 'right' });
    document.end();
  } catch (error) { next(error); }
});
router.get('/invoices', requirePermission('invoice.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await listInvoices() }); } catch (error) { next(error); }
});
router.get('/invoices/:id/pdf', requirePermission('invoice.view'), async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(String(req.params.id)).populate('customer').lean();
    if (!invoice) throw new Error('Invoice not found');
    const document = new PDFDocument({ margin: 48 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    document.pipe(res);
    document.fontSize(22).text('Restaurant Management System', { align: 'center' });
    document.moveDown().fontSize(16).text(`Invoice ${invoice.invoiceNumber}`);
    if (invoice.customerName) document.fontSize(11).text(`Customer: ${invoice.customerName}${invoice.customerPhone ? ` (${invoice.customerPhone})` : ''}`);
    document.moveDown();
    for (const item of invoice.items) document.fontSize(11).text(`${item.name} x${item.quantity}  $${item.lineTotal.toFixed(2)}`);
    document.moveDown().text(`Subtotal: $${invoice.subtotal.toFixed(2)}`);
    document.text(`Discount: $${invoice.discountTotal.toFixed(2)}`);
    document.text(`Tax: $${invoice.taxTotal.toFixed(2)}`);
    document.text(`Total: $${invoice.total.toFixed(2)}`, { align: 'right' });
    document.end();
  } catch (error) { next(error); }
});
router.get('/receipt-template', requirePermission('receipt.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await getReceiptTemplate() }); } catch (error) { next(error); }
});
router.put('/receipt-template', requirePermission('receipt.manage'), validateBody(templateSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await saveReceiptTemplate(req.body, userId(req)) }); } catch (error) { next(error); }
});

export default router;
