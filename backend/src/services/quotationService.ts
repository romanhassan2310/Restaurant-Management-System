import Quotation, { IQuotation, IQuotationItem } from '../models/Quotation.js';
import { Order } from '../models/Order.js';
import CateringOrder from '../models/CateringOrder.js';
import { AuditLog } from '../models/AuditLog.js';

export interface CreateQuotationDTO {
  customer?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: Array<{
    product?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
  }>;
  validUntil: string;
  notes?: string;
}

export class QuotationService {
  private generateQuotationNumber(): string {
    const prefix = 'QT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${timestamp}-${random}`;
  }

  async createQuotation(dto: CreateQuotationDTO, createdById?: string): Promise<IQuotation> {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const formattedItems: IQuotationItem[] = dto.items.map((item) => {
      const lineBase = item.quantity * item.unitPrice;
      const discount = item.discount || 0;
      const taxableBase = Math.max(0, lineBase - discount);
      const taxRate = item.taxRate || 0;
      const taxAmount = (taxableBase * taxRate) / 100;
      const lineSubtotal = Number((taxableBase + taxAmount).toFixed(2));

      subtotal += lineBase;
      discountTotal += discount;
      taxTotal += taxAmount;

      return {
        product: item.product as any,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount,
        taxRate,
        subtotal: lineSubtotal,
      };
    });

    const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));

    const quotation = new Quotation({
      quotationNumber: this.generateQuotationNumber(),
      customer: dto.customer,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      items: formattedItems,
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal,
      validUntil: new Date(dto.validUntil),
      notes: dto.notes,
      status: 'draft',
      createdById,
    });

    await quotation.save();

    await AuditLog.create({
      user: createdById,
      action: 'QUOTATION_CREATED',
      module: 'quotation',
      entity: 'Quotation',
      entityId: quotation._id.toString(),
      after: { quotationNumber: quotation.quotationNumber, grandTotal: quotation.grandTotal },
    });

    return quotation;
  }

  async getQuotations(filters: { status?: string; search?: string }): Promise<IQuotation[]> {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { quotationNumber: new RegExp(filters.search, 'i') },
        { customerName: new RegExp(filters.search, 'i') },
        { customerPhone: new RegExp(filters.search, 'i') },
      ];
    }
    return Quotation.find(query).populate('customer', 'name phone email').sort({ createdAt: -1 });
  }

  async getQuotationById(id: string): Promise<IQuotation> {
    const quotation = await Quotation.findById(id).populate('customer');
    if (!quotation) throw new Error('Quotation not found');
    return quotation;
  }

  async updateQuotationStatus(id: string, status: IQuotation['status'], userId?: string): Promise<IQuotation> {
    const quotation = await Quotation.findById(id);
    if (!quotation) throw new Error('Quotation not found');

    if (quotation.status === 'converted' && status !== 'converted') {
      throw new Error('Cannot change status of a converted quotation');
    }

    const previousStatus = quotation.status;
    quotation.status = status;
    await quotation.save();

    await AuditLog.create({
      user: userId,
      action: 'QUOTATION_STATUS_UPDATED',
      module: 'quotation',
      entity: 'Quotation',
      entityId: quotation._id.toString(),
      before: { status: previousStatus },
      after: { status },
    });

    return quotation;
  }

  async convertToOrder(
    quotationId: string,
    conversionType: 'pos_order' | 'catering_order',
    additionalParams?: { eventName?: string; eventDate?: string; guestCount?: number; venueAddress?: string },
    userId?: string
  ): Promise<{ quotation: IQuotation; order?: any; cateringOrder?: any }> {
    const quotation = await Quotation.findById(quotationId);
    if (!quotation) throw new Error('Quotation not found');

    if (quotation.status !== 'accepted' && quotation.status !== 'sent' && quotation.status !== 'draft') {
      throw new Error(`Cannot convert quotation with status '${quotation.status}'`);
    }

    if (conversionType === 'catering_order') {
      const eventName = additionalParams?.eventName || `Catering Event - ${quotation.customerName}`;
      const eventDate = additionalParams?.eventDate ? new Date(additionalParams.eventDate) : new Date(quotation.validUntil);
      const guestCount = additionalParams?.guestCount || 20;
      const venueAddress = additionalParams?.venueAddress || 'Customer Address';

      const cateringMenuItems = quotation.items.map((i) => ({
        product: i.product,
        name: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      }));

      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(100 + Math.random() * 900);
      const cateringNumber = `CAT-${timestamp}-${random}`;

      const cateringOrder = new CateringOrder({
        cateringNumber,
        customer: quotation.customer,
        customerName: quotation.customerName,
        customerPhone: quotation.customerPhone,
        customerEmail: quotation.customerEmail,
        eventName,
        eventDate,
        guestCount,
        venueAddress,
        menuItems: cateringMenuItems,
        subtotal: quotation.subtotal,
        discountAmount: quotation.discountTotal,
        taxAmount: quotation.taxTotal,
        totalAmount: quotation.grandTotal,
        depositPaid: 0,
        balanceDue: quotation.grandTotal,
        status: 'confirmed',
        quotationRef: quotation._id,
        notes: quotation.notes,
      });

      await cateringOrder.save();

      quotation.status = 'converted';
      quotation.convertedCateringId = cateringOrder._id as any;
      await quotation.save();

      await AuditLog.create({
        user: userId,
        action: 'QUOTATION_CONVERTED',
        module: 'quotation',
        entity: 'Quotation',
        entityId: quotation._id.toString(),
        after: { target: 'CateringOrder', targetId: cateringOrder._id.toString() },
      });

      return { quotation, cateringOrder };
    } else {
      // Create standard POS Order
      const timestamp = Date.now().toString().slice(-6);
      const orderNumber = `ORD-${timestamp}`;

      const orderItems = quotation.items.map((i) => ({
        product: i.product || undefined,
        name: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      }));

      const order = new Order({
        orderNumber,
        type: 'takeaway',
        status: 'confirmed',
        items: orderItems,
        subtotal: quotation.subtotal,
        discountAmount: quotation.discountTotal,
        taxAmount: quotation.taxTotal,
        totalAmount: quotation.grandTotal,
        paymentStatus: 'unpaid',
        notes: `Converted from Quotation #${quotation.quotationNumber}. ${quotation.notes || ''}`,
      });

      await order.save();

      quotation.status = 'converted';
      quotation.convertedOrderId = order._id as any;
      await quotation.save();

      await AuditLog.create({
        user: userId,
        action: 'QUOTATION_CONVERTED',
        module: 'quotation',
        entity: 'Quotation',
        entityId: quotation._id.toString(),
        after: { target: 'Order', targetId: order._id.toString() },
      });

      return { quotation, order };
    }
  }
}

export default new QuotationService();
