import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import cateringService from '../services/cateringService.js';

export class CateringController {
  async createCateringOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const catering = await cateringService.createCateringOrder(req.body, req.user?.id);
      res.status(201).json({ success: true, data: catering });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getCateringOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const filters = {
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };
      const orders = await cateringService.getCateringOrders(filters);
      res.json({ success: true, data: orders });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getCateringOrderById(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const order = await cateringService.getCateringOrderById(id);
      res.json({ success: true, data: order });
    } catch (err: any) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async updateCateringStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const order = await cateringService.updateCateringStatus(id, status, req.user?.id);
      res.json({ success: true, data: order });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async recordPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { amount } = req.body;
      const order = await cateringService.recordDepositOrPayment(id, Number(amount), req.user?.id);
      res.json({ success: true, data: order });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export default new CateringController();
