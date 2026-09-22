import { Request, Response } from 'express';
import { crmService } from '../services/crmService.js';

export class CrmController {
  // Customers
  async getCustomers(req: Request, res: Response) {
    try {
      const { search, customerGroup, leadSource, minSpending, maxSpending, tag, isActive, page, limit } = req.query;
      const result = await crmService.getCustomers({
        search: search as string,
        customerGroup: customerGroup as string,
        leadSource: leadSource as string,
        minSpending: minSpending ? Number(minSpending) : undefined,
        maxSpending: maxSpending ? Number(maxSpending) : undefined,
        tag: tag as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getCustomerById(req: Request, res: Response) {
    try {
      const customer = await crmService.getCustomerById(String(req.params.id));
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      res.json(customer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async createCustomer(req: Request, res: Response) {
    try {
      const customer = await crmService.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async updateCustomer(req: Request, res: Response) {
    try {
      const customer = await crmService.updateCustomer(String(req.params.id), req.body);
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      res.json(customer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async deleteCustomer(req: Request, res: Response) {
    try {
      const success = await crmService.deleteCustomer(String(req.params.id));
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Customer Groups
  async getCustomerGroups(_req: Request, res: Response) {
    try {
      const groups = await crmService.getCustomerGroups();
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async createCustomerGroup(req: Request, res: Response) {
    try {
      const group = await crmService.createCustomerGroup(req.body);
      res.status(201).json(group);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async updateCustomerGroup(req: Request, res: Response) {
    try {
      const group = await crmService.updateCustomerGroup(String(req.params.id), req.body);
      res.json(group);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async deleteCustomerGroup(req: Request, res: Response) {
    try {
      const success = await crmService.deleteCustomerGroup(String(req.params.id));
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Promotions
  async getPromotions(_req: Request, res: Response) {
    try {
      const promotions = await crmService.getPromotions();
      res.json(promotions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async createPromotion(req: Request, res: Response) {
    try {
      const promo = await crmService.createPromotion(req.body);
      res.status(201).json(promo);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async updatePromotion(req: Request, res: Response) {
    try {
      const promo = await crmService.updatePromotion(String(req.params.id), req.body);
      res.json(promo);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async deletePromotion(req: Request, res: Response) {
    try {
      const success = await crmService.deletePromotion(String(req.params.id));
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async validatePromotionCode(req: Request, res: Response) {
    try {
      const { code, orderAmount, customerGroupId } = req.body;
      if (!code || orderAmount === undefined) {
        return res.status(400).json({ error: 'Code and orderAmount are required' });
      }
      const result = await crmService.validatePromotionCode(code, Number(orderAmount), customerGroupId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Credit Management
  async adjustCredit(req: Request, res: Response) {
    try {
      const { amount, type, notes, orderId } = req.body;
      const createdBy = (req as any).user?.id || (req as any).user?.userId;
      const result = await crmService.adjustCustomerCredit(
        String(req.params.id),
        Number(amount),
        type,
        notes,
        createdBy,
        orderId
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getCustomerHistory(req: Request, res: Response) {
    try {
      const history = await crmService.getCustomerHistory(String(req.params.id));
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async captureQrLead(req: Request, res: Response) {
    try {
      const customer = await crmService.captureQrLead(req.body);
      res.status(201).json(customer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}

export const crmController = new CrmController();
