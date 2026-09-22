import CateringOrder, { ICateringOrder, ICateringMenuItem } from '../models/CateringOrder.js';
import { AuditLog } from '../models/AuditLog.js';

export interface CreateCateringOrderDTO {
  customer?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  eventName: string;
  eventDate: string;
  guestCount: number;
  venueAddress: string;
  menuItems: Array<{
    product?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
  deliveryFee?: number;
  taxAmount?: number;
  discountAmount?: number;
  depositPaid?: number;
  notes?: string;
}

export class CateringService {
  private generateCateringNumber(): string {
    const prefix = 'CAT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${timestamp}-${random}`;
  }

  async createCateringOrder(dto: CreateCateringOrderDTO, userId?: string): Promise<ICateringOrder> {
    const formattedItems: ICateringMenuItem[] = dto.menuItems.map((item) => {
      const subtotal = Number((item.quantity * item.unitPrice).toFixed(2));
      return {
        product: item.product as any,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
        notes: item.notes,
      };
    });

    const itemsSubtotal = formattedItems.reduce((acc, i) => acc + i.subtotal, 0);
    const deliveryFee = dto.deliveryFee || 0;
    const taxAmount = dto.taxAmount || 0;
    const discountAmount = dto.discountAmount || 0;

    const totalAmount = Number((itemsSubtotal + deliveryFee + taxAmount - discountAmount).toFixed(2));
    const depositPaid = dto.depositPaid || 0;
    const balanceDue = Number((totalAmount - depositPaid).toFixed(2));

    const catering = new CateringOrder({
      cateringNumber: this.generateCateringNumber(),
      customer: dto.customer,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      eventName: dto.eventName,
      eventDate: new Date(dto.eventDate),
      guestCount: dto.guestCount,
      venueAddress: dto.venueAddress,
      menuItems: formattedItems,
      deliveryFee,
      subtotal: itemsSubtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      depositPaid,
      balanceDue,
      status: depositPaid > 0 ? 'confirmed' : 'inquiry',
      notes: dto.notes,
    });

    await catering.save();

    await AuditLog.create({
      user: userId,
      action: 'CATERING_ORDER_CREATED',
      module: 'catering',
      entity: 'CateringOrder',
      entityId: catering._id.toString(),
      after: {
        cateringNumber: catering.cateringNumber,
        eventName: catering.eventName,
        totalAmount: catering.totalAmount,
      },
    });

    return catering;
  }

  async getCateringOrders(filters: { status?: string; startDate?: string; endDate?: string }): Promise<ICateringOrder[]> {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.startDate || filters.endDate) {
      query.eventDate = {};
      if (filters.startDate) query.eventDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.eventDate.$lte = new Date(filters.endDate);
    }

    return CateringOrder.find(query).populate('customer', 'name phone email').sort({ eventDate: 1 });
  }

  async getCateringOrderById(id: string): Promise<ICateringOrder> {
    const catering = await CateringOrder.findById(id).populate('customer');
    if (!catering) throw new Error('Catering order not found');
    return catering;
  }

  async updateCateringStatus(
    id: string,
    status: ICateringOrder['status'],
    userId?: string
  ): Promise<ICateringOrder> {
    const catering = await CateringOrder.findById(id);
    if (!catering) throw new Error('Catering order not found');

    const previousStatus = catering.status;
    catering.status = status;
    await catering.save();

    await AuditLog.create({
      user: userId,
      action: 'CATERING_STATUS_UPDATED',
      module: 'catering',
      entity: 'CateringOrder',
      entityId: catering._id.toString(),
      before: { status: previousStatus },
      after: { status },
    });

    return catering;
  }

  async recordDepositOrPayment(id: string, amount: number, userId?: string): Promise<ICateringOrder> {
    const catering = await CateringOrder.findById(id);
    if (!catering) throw new Error('Catering order not found');

    catering.depositPaid = Number((catering.depositPaid + amount).toFixed(2));
    catering.balanceDue = Number(Math.max(0, catering.totalAmount - catering.depositPaid).toFixed(2));

    if (catering.status === 'inquiry' && catering.depositPaid > 0) {
      catering.status = 'confirmed';
    }

    await catering.save();

    await AuditLog.create({
      user: userId,
      action: 'CATERING_PAYMENT_RECORDED',
      module: 'catering',
      entity: 'CateringOrder',
      entityId: catering._id.toString(),
      after: { paymentReceived: amount, remainingBalance: catering.balanceDue },
    });

    return catering;
  }
}

export default new CateringService();
