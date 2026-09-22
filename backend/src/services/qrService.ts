import crypto from 'crypto';
import QRCode from 'qrcode';
import { AppError } from '../middleware/errorHandler.js';
import { Category } from '../models/Category.js';
import { Customer } from '../models/Customer.js';
import { Modifier } from '../models/Modifier.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { RestaurantTable } from '../models/RestaurantTable.js';
import { env } from '../config/env.js';
import { createOrder, type OrderInput } from './orderService.js';

export async function generateTableQr(tableId: string) {
  const table = await RestaurantTable.findById(tableId).select('+qrToken');
  if (!table || !table.isActive || table.status === 'inactive') throw new AppError('Active table not found', 404);
  table.qrToken = table.qrToken || crypto.randomBytes(24).toString('hex');
  table.qrEnabled = true;
  await table.save();
  const url = `${env.clientUrl}/qr/${table.qrToken}`;
  return { tableId: String(table._id), tableName: table.name, url, qrDataUrl: await QRCode.toDataURL(url) };
}

async function getQrTable(token: string) {
  const table = await RestaurantTable.findOne({ qrToken: token, qrEnabled: true, isActive: true }).select('+qrToken').populate('floor').lean();
  if (!table || table.status === 'inactive' || table.status === 'cleaning') throw new AppError('QR table is invalid or inactive', 404);
  return table;
}

export async function getQrMenu(token: string) {
  const table = await getQrTable(token);
  const [categories, products, variants, modifiers] = await Promise.all([
    Category.find({ isActive: true }).sort({ name: 1 }).lean(),
    Product.find({ isActive: true }).populate('category').sort({ name: 1 }).lean(),
    ProductVariant.find({ isActive: true }).lean(),
    Modifier.find({ isActive: true }).lean(),
  ]);
  return { table: { id: String(table._id), name: table.name, capacity: table.capacity, status: table.status }, categories, products, variants, modifiers };
}

async function findOrCreateCustomer(name: string, phone: string, email?: string) {
  const existing = await Customer.findOne({ phone, isActive: true });
  if (existing) {
    if (name && existing.name !== name) { existing.name = name; await existing.save(); }
    return existing;
  }
  return Customer.create({ name, phone, email });
}

import { crmService } from './crmService.js';

export async function submitQrOrder(
  token: string,
  input: Omit<OrderInput, 'table' | 'source' | 'type'> & {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    promoCode?: string;
    paymentMethod?: 'cash' | 'card' | 'qr' | 'mobile_payment';
  }
) {
  const table = await getQrTable(token);
  const customer = await crmService.captureQrLead({
    name: input.customerName,
    phone: input.customerPhone,
    email: input.customerEmail,
  });

  let discountType = input.discountType;
  let discountValue = input.discountValue;

  if (input.promoCode) {
    // Estimate order subtotal for promo validation
    const validation = await crmService.validatePromotionCode(
      input.promoCode,
      1000, // placeholder amount; validation will run inside orderService on build
      customer.customerGroup ? String(customer.customerGroup) : undefined
    );
    if (validation.valid && validation.promotion) {
      discountType = validation.promotion.discountType;
      discountValue = validation.promotion.discountValue;
      validation.promotion.usageCount += 1;
      await validation.promotion.save();
    }
  }

  const order = await createOrder({
    ...input,
    table: String(table._id),
    type: 'dine_in',
    source: 'qr',
    customer: String(customer._id),
    guestCount: input.guestCount ?? 1,
    discountType,
    discountValue,
  });
  return { order, table: { id: String(table._id), name: table.name }, customer: { id: String(customer._id), name: customer.name } };
}

export async function getQrOrderStatus(token: string, orderId: string) {
  const table = await getQrTable(token);
  const order = await Order.findOne({ _id: orderId, table: table._id, source: 'qr' }).select('orderNumber status paymentStatus total createdAt updatedAt').lean();
  if (!order) throw new AppError('QR order not found', 404);
  return { table: { id: String(table._id), name: table.name }, order };
}
