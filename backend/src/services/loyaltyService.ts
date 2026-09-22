import { Customer, ICustomer } from '../models/Customer.js';
import { LoyaltyLevel, ILoyaltyLevel } from '../models/LoyaltyLevel.js';
import { LoyaltyReward, ILoyaltyReward } from '../models/LoyaltyReward.js';
import { LoyaltyTransaction, ILoyaltyTransaction } from '../models/LoyaltyTransaction.js';

export class LoyaltyService {
  // Loyalty Tiers / Levels
  async createLevel(data: Partial<ILoyaltyLevel>): Promise<ILoyaltyLevel> {
    const level = new LoyaltyLevel(data);
    return level.save();
  }

  async getLevels(): Promise<ILoyaltyLevel[]> {
    return LoyaltyLevel.find({ isActive: true }).sort({ minSpend: 1, minPoints: 1 });
  }

  async updateLevel(id: string, data: Partial<ILoyaltyLevel>): Promise<ILoyaltyLevel | null> {
    return LoyaltyLevel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteLevel(id: string): Promise<boolean> {
    const res = await LoyaltyLevel.findByIdAndUpdate(id, { isActive: false });
    return !!res;
  }

  async evaluateCustomerLevel(customerId: string): Promise<ICustomer | null> {
    const customer = await Customer.findById(customerId);
    if (!customer) return null;

    const levels = await LoyaltyLevel.find({ isActive: true }).sort({ minSpend: -1, minPoints: -1 });
    let matchedLevel: ILoyaltyLevel | null = null;

    for (const lvl of levels) {
      if (customer.totalSpending >= lvl.minSpend && customer.loyaltyPoints >= lvl.minPoints) {
        matchedLevel = lvl;
        break;
      }
    }

    if (matchedLevel && (!customer.loyaltyLevel || customer.loyaltyLevel.toString() !== matchedLevel._id.toString())) {
      customer.loyaltyLevel = matchedLevel._id;
      await customer.save();
    }

    return customer;
  }

  // Rewards Catalog
  async createReward(data: Partial<ILoyaltyReward>): Promise<ILoyaltyReward> {
    const reward = new LoyaltyReward(data);
    return reward.save();
  }

  async getRewards(): Promise<ILoyaltyReward[]> {
    return LoyaltyReward.find({ isActive: true }).sort({ pointsRequired: 1 });
  }

  async updateReward(id: string, data: Partial<ILoyaltyReward>): Promise<ILoyaltyReward | null> {
    return LoyaltyReward.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteReward(id: string): Promise<boolean> {
    const res = await LoyaltyReward.findByIdAndUpdate(id, { isActive: false });
    return !!res;
  }

  // Points Earning & Redemption
  async awardPoints(
    customerId: string,
    orderAmount: number,
    orderId?: string
  ): Promise<{ customer: ICustomer; pointsEarned: number; transaction?: ILoyaltyTransaction }> {
    const customer = await Customer.findById(customerId).populate('loyaltyLevel');
    if (!customer) throw new Error('Customer not found');

    // Update customer spending and purchase count
    customer.totalSpending += orderAmount;
    customer.purchaseCount += 1;

    // Evaluate tier multiplier
    let multiplier = 1;
    if (customer.loyaltyLevel && typeof customer.loyaltyLevel === 'object') {
      multiplier = (customer.loyaltyLevel as unknown as ILoyaltyLevel).pointsMultiplier || 1;
    }

    const pointsEarned = Math.floor(orderAmount * multiplier);

    if (pointsEarned > 0) {
      customer.loyaltyPoints += pointsEarned;
      await customer.save();

      const transaction = new LoyaltyTransaction({
        customer: customer._id,
        type: 'earn',
        points: pointsEarned,
        balanceAfter: customer.loyaltyPoints,
        orderId,
        description: `Earned ${pointsEarned} points on order spend of $${orderAmount.toFixed(2)} (${multiplier}x multiplier)`,
      });
      await transaction.save();

      await this.evaluateCustomerLevel(customerId);
      return { customer, pointsEarned, transaction };
    }

    await customer.save();
    await this.evaluateCustomerLevel(customerId);
    return { customer, pointsEarned: 0 };
  }

  async redeemReward(
    customerId: string,
    rewardId: string,
    orderId?: string
  ): Promise<{ customer: ICustomer; reward: ILoyaltyReward; transaction: ILoyaltyTransaction }> {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error('Customer not found');

    const reward = await LoyaltyReward.findById(rewardId);
    if (!reward || !reward.isActive) throw new Error('Reward not found or inactive');

    if (customer.loyaltyPoints < reward.pointsRequired) {
      throw new Error(`Insufficient loyalty points. Required: ${reward.pointsRequired}, Available: ${customer.loyaltyPoints}`);
    }

    customer.loyaltyPoints -= reward.pointsRequired;
    await customer.save();

    const transaction = new LoyaltyTransaction({
      customer: customer._id,
      type: 'redeem',
      points: -reward.pointsRequired,
      balanceAfter: customer.loyaltyPoints,
      orderId,
      rewardId: reward._id,
      description: `Redeemed reward "${reward.title}" for ${reward.pointsRequired} points`,
    });
    await transaction.save();

    return { customer, reward, transaction };
  }

  async adjustPoints(
    customerId: string,
    pointsDelta: number,
    description: string
  ): Promise<{ customer: ICustomer; transaction: ILoyaltyTransaction }> {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error('Customer not found');

    const newPoints = customer.loyaltyPoints + pointsDelta;
    if (newPoints < 0) {
      throw new Error(`Cannot adjust points below 0. Current points: ${customer.loyaltyPoints}`);
    }

    customer.loyaltyPoints = newPoints;
    await customer.save();

    const transaction = new LoyaltyTransaction({
      customer: customer._id,
      type: 'adjust',
      points: pointsDelta,
      balanceAfter: newPoints,
      description: description || 'Manual point adjustment by admin',
    });
    await transaction.save();

    await this.evaluateCustomerLevel(customerId);
    return { customer, transaction };
  }

  async getLoyaltyHistory(customerId: string): Promise<ILoyaltyTransaction[]> {
    return LoyaltyTransaction.find({ customer: customerId }).populate('rewardId').sort({ createdAt: -1 });
  }

  async getAllLoyaltyTransactions(limit = 100): Promise<ILoyaltyTransaction[]> {
    return LoyaltyTransaction.find().populate('customer').populate('rewardId').sort({ createdAt: -1 }).limit(limit);
  }
}

export const loyaltyService = new LoyaltyService();
