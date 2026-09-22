import { Request, Response } from 'express';
import { payrollService } from '../services/payrollService.js';
import { AuditLog } from '../models/AuditLog.js';

export class PayrollController {
  // Periods
  async createPayrollPeriod(req: Request, res: Response) {
    try {
      const { title, startDate, endDate } = req.body;
      const period = await payrollService.createPayrollPeriod(title, startDate, endDate);
      const userId = (req as any).user?.id;
      await AuditLog.create({
        user: userId,
        action: 'payroll_period_created',
        module: 'payroll',
        entity: 'PayrollPeriod',
        entityId: String(period._id),
        after: req.body,
      });
      res.status(201).json(period);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getPayrollPeriods(_req: Request, res: Response) {
    try {
      const periods = await payrollService.getPayrollPeriods();
      res.json(periods);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getPayrollPeriodById(req: Request, res: Response) {
    try {
      const period = await payrollService.getPayrollPeriodById(String(req.params.id));
      if (!period) return res.status(404).json({ error: 'Payroll period not found' });
      res.json(period);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async approvePayrollPeriod(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const period = await payrollService.approvePayrollPeriod(String(req.params.id), userId);
      await AuditLog.create({
        user: userId,
        action: 'payroll_period_approved',
        module: 'payroll',
        entity: 'PayrollPeriod',
        entityId: String(req.params.id),
      });
      res.json(period);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async payOutPayrollPeriod(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const period = await payrollService.payOutPayrollPeriod(String(req.params.id));
      await AuditLog.create({
        user: userId,
        action: 'payroll_period_payout',
        module: 'payroll',
        entity: 'PayrollPeriod',
        entityId: String(req.params.id),
      });
      res.json(period);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // Payslips
  async getPayslipsByPeriod(req: Request, res: Response) {
    try {
      const payslips = await payrollService.getPayslipsByPeriod(String(req.params.id));
      res.json(payslips);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getPayslipById(req: Request, res: Response) {
    try {
      const payslip = await payrollService.getPayslipById(String(req.params.id));
      if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
      res.json(payslip);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async updatePayslip(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const payslip = await payrollService.updatePayslip(String(req.params.id), req.body);
      await AuditLog.create({
        user: userId,
        action: 'payslip_updated',
        module: 'payroll',
        entity: 'Payslip',
        entityId: String(req.params.id),
        after: req.body,
      });
      res.json(payslip);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // Salary Reports
  async getDepartmentSalaryReport(req: Request, res: Response) {
    try {
      const report = await payrollService.getDepartmentSalaryReport(String(req.params.id));
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const payrollController = new PayrollController();
