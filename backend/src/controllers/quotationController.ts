import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import quotationService from '../services/quotationService.js';

export class QuotationController {
  async createQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const quotation = await quotationService.createQuotation(req.body, req.user?.id);
      res.status(201).json({ success: true, data: quotation });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getQuotations(req: AuthenticatedRequest, res: Response) {
    try {
      const filters = {
        status: req.query.status as string,
        search: req.query.search as string,
      };
      const quotations = await quotationService.getQuotations(filters);
      res.json({ success: true, data: quotations });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getQuotationById(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const quotation = await quotationService.getQuotationById(id);
      res.json({ success: true, data: quotation });
    } catch (err: any) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async updateQuotationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const quotation = await quotationService.updateQuotationStatus(id, status, req.user?.id);
      res.json({ success: true, data: quotation });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async convertToOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { conversionType, eventName, eventDate, guestCount, venueAddress } = req.body;
      const result = await quotationService.convertToOrder(
        id,
        conversionType || 'pos_order',
        { eventName, eventDate, guestCount, venueAddress },
        req.user?.id
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export default new QuotationController();
