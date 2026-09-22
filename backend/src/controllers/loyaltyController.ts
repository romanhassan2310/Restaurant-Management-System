import { Request, Response } from 'express';
import { loyaltyService } from '../services/loyaltyService.js';

export class LoyaltyController {
  // Levels
  async getLevels(_req: Request, res: Response) {
    try {
      const levels = await loyaltyService.getLevels();
      res.json(levels);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async createLevel(req: Request, res: Response) {
    try {
      const level = await loyaltyService.createLevel(req.body);
      res.status(201).json(level);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async updateLevel(req: Request, res: Response) {
    try {
      const level = await loyaltyService.updateLevel(req.params.id, req.body);
      res.json(level);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async deleteLevel(req: Request, res: Response) {
    try {
      const success = await loyaltyService.deleteLevel(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Rewards
  async getRewards(_req: Request, res: Response) {
    try {
      const rewards = await loyaltyService.getRewards();
      res.json(rewards);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async createReward(req: Request, res: Response) {
    try {
      const reward = await loyaltyService.createReward(req.body);
      res.status(201).json(reward);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async updateReward(req: Request, res: Response) {
    try {
      const reward = await loyaltyService.updateReward(req.params.id, req.body);
      res.json(reward);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async deleteReward(req: Request, res: Response) {
    try {
      const success = await loyaltyService.deleteReward(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Points Actions
  async redeemReward(req: Request, res: Response) {
    try {
      const { customerId, rewardId, orderId } = req.body;
      const result = await loyaltyService.redeemReward(customerId, rewardId, orderId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async adjustPoints(req: Request, res: Response) {
    try {
      const { customerId, pointsDelta, description } = req.body;
      const result = await loyaltyService.adjustPoints(customerId, Number(pointsDelta), description);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getCustomerLoyaltyHistory(req: Request, res: Response) {
    try {
      const history = await loyaltyService.getLoyaltyHistory(req.params.customerId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAllTransactions(_req: Request, res: Response) {
    try {
      const transactions = await loyaltyService.getAllLoyaltyTransactions();
      res.json(transactions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const loyaltyController = new LoyaltyController();
