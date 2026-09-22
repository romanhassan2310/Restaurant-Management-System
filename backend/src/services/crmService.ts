import { Customer, ICustomer } from '../models/Customer.js';
import { CustomerGroup, ICustomerGroup } from '../models/CustomerGroup.js';
import { Promotion, IPromotion } from '../models/Promotion.js';
import { CreditTransaction, ICreditTransaction } from '../models/CreditTransaction.js';
import { Order } from '../models/Order.js';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction.js';

export class CrmService {
  // Customer CRUD & Search
  async createCustomer(data: Partial<ICustomer>): Promise<ICustomer> {
    const customer = new Customer(data);
    await customer.save();
    await this.evaluateSegmentation(customer._id.toString());
    return customer;
  }

  async getCustomers(filter: {
    search?: string;
    customerGroup?: string;
    leadSource?: string;
    minSpending?: number;
    maxSpending?: number;
    tag?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive;
    }
    if (filter.customerGroup) {
      query.customerGroup = filter.customerGroup;
    }
    if (filter.leadSource) {
      query.leadSource = filter.leadSource;
    }
    if (filter.tag) {
      query.segmentationTags = filter.tag;
    }
    if (filter.minSpending !== undefined || filter.maxSpending !== undefined) {
      query.totalSpending = {};
      if (filter.minSpending !== undefined) query.totalSpending.$gte = filter.minSpending;
      if (filter.maxSpending !== undefined) query.totalSpending.$lte = filter.maxSpending;
    }
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(query).populate('customerGroup').populate('loyaltyLevel').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(query),
    ]);

    return { customers, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getCustomerById(id: string): Promise<ICustomer | null> {
    return Customer.findById(id).populate('customerGroup').populate('loyaltyLevel');
  }

  async updateCustomer(id: string, data: Partial<ICustomer>): Promise<ICustomer | null> {
    const customer = await Customer.findByIdAndUpdate(id, data, { new: true }).populate('customerGroup').populate('loyaltyLevel');
    if (customer) {
      await this.evaluateSegmentation(id);
    }
    return customer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const res = await Customer.findByIdAndUpdate(id, { isActive: false });
    return !!res;
  }

  // Segmentation Engine
  async evaluateSegmentation(customerId: string): Promise<ICustomer | null> {
    const customer = await Customer.findById(customerId);
    if (!customer) return null;

    const tags = new Set<string>(customer.segmentationTags || []);

    if (customer.totalSpending >= 1000) {
      tags.add('VIP');
      tags.add('High Spender');
    } else if (customer.totalSpending >= 500) {
      tags.add('High Spender');
    }

    if (customer.purchaseCount >= 10) {
      tags.add('Frequent Guest');
    }

    if (customer.leadSource === 'qr_order') {
      tags.add('QR Lead');
    }

    customer.segmentationTags = Array.from(tags);
    await customer.save();
    return customer;
  }

  // Customer Groups
  async createCustomerGroup(data: Partial<ICustomerGroup>): Promise<ICustomerGroup> {
    const group = new CustomerGroup(data);
    return group.save();
  }

  async getCustomerGroups(): Promise<ICustomerGroup[]> {
    return CustomerGroup.find({ isActive: true }).sort({ name: 1 });
  }

  async updateCustomerGroup(id: string, data: Partial<ICustomerGroup>): Promise<ICustomerGroup | null> {
    return CustomerGroup.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteCustomerGroup(id: string): Promise<boolean> {
    const res = await CustomerGroup.findByIdAndUpdate(id, { isActive: false });
    return !!res;
  }

  // Promotions
  async createPromotion(data: Partial<IPromotion>): Promise<IPromotion> {
    if (data.code) {
      data.code = data.code.toUpperCase();
    }
    const promo = new Promotion(data);
    return promo.save();
  }

  async getPromotions(): Promise<IPromotion[]> {
    return Promotion.find().populate('applicableCustomerGroups').sort({ createdAt: -1 });
  }

  async updatePromotion(id: string, data: Partial<IPromotion>): Promise<IPromotion | null> {
    if (data.code) {
      data.code = data.code.toUpperCase();
    }
    return Promotion.findByIdAndUpdate(id, data, { new: true });
  }

  async deletePromotion(id: string): Promise<boolean> {
    const res = await Promotion.findByIdAndUpdate(id, { isActive: false });
    return !!res;
  }

  async validatePromotionCode(code: string, orderAmount: number, customerGroupId?: string) {
    const promo = await Promotion.findOne({ code: code.toUpperCase(), isActive: true });
    if (!promo) {
      return { valid: false, message: 'Invalid or inactive promotion code' };
    }

    const now = new Date();
    if (promo.startDate && promo.startDate > now) {
      return { valid: false, message: 'Promotion has not started yet' };
    }
    if (promo.endDate && promo.endDate < now) {
      return { valid: false, message: 'Promotion has expired' };
    }
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return { valid: false, message: 'Promotion usage limit reached' };
    }
    if (orderAmount < promo.minOrderAmount) {
      return { valid: false, message: `Minimum order amount of $${promo.minOrderAmount} required` };
    }
    if (promo.applicableCustomerGroups && promo.applicableCustomerGroups.length > 0) {
      if (!customerGroupId || !promo.applicableCustomerGroups.some(g => g.toString() === customerGroupId.toString())) {
        return { valid: false, message: 'Promotion is not applicable to your customer group' };
      }
    }

    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = (orderAmount * promo.discountValue) / 100;
      if (promo.maxDiscountAmount && discount > promo.maxDiscountAmount) {
        discount = promo.maxDiscountAmount;
      }
    } else {
      discount = promo.discountValue;
    }

    return {
      valid: true,
      promotion: promo,
      discountAmount: Math.min(discount, orderAmount),
    };
  }

  // Credit Management
  async adjustCustomerCredit(
    customerId: string,
    amount: number,
    type: 'deposit' | 'deduction' | 'order_payment' | 'order_refund',
    notes?: string,
    createdBy?: string,
    orderId?: string
  ): Promise<{ customer: ICustomer; transaction: ICreditTransaction }> {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error('Customer not found');

    const isDeduction = type === 'deduction' || type === 'order_payment';
    const effectiveAmount = isDeduction ? -Math.abs(amount) : Math.abs(amount);

    const newBalance = customer.creditBalance + effectiveAmount;
    if (newBalance < 0) {
      throw new Error(`Insufficient credit balance. Available balance: $${customer.creditBalance.toFixed(2)}`);
    }

    customer.creditBalance = newBalance;
    await customer.save();

    const transaction = new CreditTransaction({
      customer: customer._id,
      type,
      amount: Math.abs(amount),
      balanceAfter: newBalance,
      orderId,
      notes,
      createdBy,
    });
    await transaction.save();

    return { customer, transaction };
  }

  async getCustomerHistory(customerId: string) {
    const [orders, creditTransactions, loyaltyTransactions] = await Promise.all([
      Order.find({ customerId: customerId }).sort({ createdAt: -1 }).limit(20),
      CreditTransaction.find({ customer: customerId }).sort({ createdAt: -1 }),
      LoyaltyTransaction.find({ customer: customerId }).sort({ createdAt: -1 }),
    ]);

    return { orders, creditTransactions, loyaltyTransactions };
  }

  // QR Lead Capture
  async captureQrLead(data: { name: string; phone?: string; email?: string }): Promise<ICustomer> {
    const { name, phone, email } = data;
    if (!name && !phone && !email) {
      throw new Error('Name, phone or email is required for QR lead capture');
    }

    let customer: ICustomer | null = null;

    if (phone) {
      customer = await Customer.findOne({ phone });
    }
    if (!customer && email) {
      customer = await Customer.findOne({ email });
    }

    if (!customer) {
      customer = new Customer({
        name: name || 'QR Guest',
        phone,
        email,
        leadSource: 'qr_order',
        segmentationTags: ['QR Lead'],
      });
      await customer.save();
    } else {
      if (!customer.segmentationTags.includes('QR Lead')) {
        customer.segmentationTags.push('QR Lead');
        await customer.save();
      }
    }

    return customer;
  }
}

export const crmService = new CrmService();
