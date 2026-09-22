import { Router } from 'express';
import { payrollController } from '../controllers/payrollController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Periods
router.get('/periods', requirePermission('payroll.view'), (req, res) => payrollController.getPayrollPeriods(req, res));
router.post('/periods', requirePermission('payroll.manage'), (req, res) => payrollController.createPayrollPeriod(req, res));
router.get('/periods/:id', requirePermission('payroll.view'), (req, res) => payrollController.getPayrollPeriodById(req, res));
router.post('/periods/:id/approve', requirePermission('payroll.manage'), (req, res) => payrollController.approvePayrollPeriod(req, res));
router.post('/periods/:id/payout', requirePermission('payroll.manage'), (req, res) => payrollController.payOutPayrollPeriod(req, res));

// Payslips
router.get('/periods/:id/payslips', requirePermission('payroll.view'), (req, res) => payrollController.getPayslipsByPeriod(req, res));
router.get('/payslips/:id', requirePermission('payroll.view'), (req, res) => payrollController.getPayslipById(req, res));
router.put('/payslips/:id', requirePermission('payroll.manage'), (req, res) => payrollController.updatePayslip(req, res));

// Salary Reports
router.get('/periods/:id/reports', requirePermission('payroll.view'), (req, res) => payrollController.getDepartmentSalaryReport(req, res));

export const payrollRoutes = router;
