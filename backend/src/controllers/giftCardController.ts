import { Request, Response } from 'express';
import { giftCardService } from '../services/giftCardService.js';

export class GiftCardController {
  async issueGiftCard(req: Request, res: Response) {
    try {
      const performedBy = (req as any).user?.userId;
      const result = await giftCardService.issueGiftCard({
        ...req.body,
        performedBy,
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async lookupGiftCard(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const card = await giftCardService.lookupGiftCard(code);
      res.json(card);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  async redeemGiftCard(req: Request, res: Response) {
    try {
      const { code, amount, orderId, branchId } = req.body;
      const performedBy = (req as any).user?.userId;
      const result = await giftCardService.redeemGiftCard(
        code,
        Number(amount),
        orderId,
        branchId,
        performedBy
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getGiftCards(req: Request, res: Response) {
    try {
      const { status, search, page, limit } = req.query;
      const result = await giftCardService.getGiftCards({
        status: status as string,
        search: search as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getGiftCardHistory(req: Request, res: Response) {
    try {
      const history = await giftCardService.getGiftCardHistory(req.params.id);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const giftCardController = new GiftCardController();
