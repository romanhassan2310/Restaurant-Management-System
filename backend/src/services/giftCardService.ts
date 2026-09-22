import crypto from 'crypto';
import { GiftCard, IGiftCard } from '../models/GiftCard.js';
import { GiftCardTransaction, IGiftCardTransaction } from '../models/GiftCardTransaction.js';

export class GiftCardService {
  private generateCode(): string {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `GC-${randomHex.substring(0, 4)}-${randomHex.substring(4, 8)}`;
  }

  async issueGiftCard(data: {
    code?: string;
    initialBalance: number;
    expiryDate?: Date;
    purchaserName?: string;
    purchaserEmail?: string;
    recipientName?: string;
    recipientEmail?: string;
    notes?: string;
    performedBy?: string;
  }): Promise<{ giftCard: IGiftCard; transaction: IGiftCardTransaction }> {
    const code = (data.code || this.generateCode()).toUpperCase();

    const existing = await GiftCard.findOne({ code });
    if (existing) {
      throw new Error(`Gift card with code ${code} already exists`);
    }

    const giftCard = new GiftCard({
      code,
      initialBalance: data.initialBalance,
      currentBalance: data.initialBalance,
      expiryDate: data.expiryDate,
      purchaserName: data.purchaserName,
      purchaserEmail: data.purchaserEmail,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      notes: data.notes,
      status: 'active',
    });
    await giftCard.save();

    const transaction = new GiftCardTransaction({
      giftCard: giftCard._id,
      giftCardCode: code,
      type: 'issue',
      amount: data.initialBalance,
      balanceAfter: data.initialBalance,
      performedBy: data.performedBy,
      notes: 'Gift card issued',
    });
    await transaction.save();

    return { giftCard, transaction };
  }

  async lookupGiftCard(code: string): Promise<IGiftCard> {
    const card = await GiftCard.findOne({ code: code.toUpperCase() });
    if (!card) {
      throw new Error('Gift card not found');
    }

    // Auto update status if expired
    if (card.status === 'active' && card.expiryDate && new Date(card.expiryDate) < new Date()) {
      card.status = 'expired';
      await card.save();
    }

    return card;
  }

  async redeemGiftCard(
    code: string,
    requestedAmount: number,
    orderId?: string,
    branchId?: string,
    performedBy?: string
  ): Promise<{ giftCard: IGiftCard; redeemedAmount: number; remainingBalance: number; transaction: IGiftCardTransaction }> {
    const card = await this.lookupGiftCard(code);

    if (card.status !== 'active') {
      throw new Error(`Gift card cannot be redeemed. Status: ${card.status}`);
    }

    if (card.currentBalance <= 0) {
      throw new Error('Gift card has zero balance');
    }

    // Support partial redemption
    const redeemedAmount = Math.min(requestedAmount, card.currentBalance);
    const remainingBalance = card.currentBalance - redeemedAmount;

    card.currentBalance = remainingBalance;
    if (remainingBalance === 0) {
      card.status = 'fully_redeemed';
    }
    await card.save();

    const transaction = new GiftCardTransaction({
      giftCard: card._id,
      giftCardCode: card.code,
      type: 'redemption',
      amount: redeemedAmount,
      balanceAfter: remainingBalance,
      orderId,
      branch: branchId,
      performedBy,
      notes: `Redeemed $${redeemedAmount.toFixed(2)} on order`,
    });
    await transaction.save();

    return { giftCard: card, redeemedAmount, remainingBalance, transaction };
  }

  async getGiftCards(filter: { status?: string; search?: string; page?: number; limit?: number }) {
    const query: any = {};
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ code: regex }, { purchaserName: regex }, { recipientName: regex }];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [giftCards, total] = await Promise.all([
      GiftCard.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      GiftCard.countDocuments(query),
    ]);

    return { giftCards, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getGiftCardHistory(giftCardId: string): Promise<IGiftCardTransaction[]> {
    return GiftCardTransaction.find({ giftCard: giftCardId }).populate('orderId').populate('performedBy').sort({ createdAt: -1 });
  }
}

export const giftCardService = new GiftCardService();
