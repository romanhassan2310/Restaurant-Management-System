import { PayrollPeriod, IPayrollPeriod } from '../models/PayrollPeriod.js';
import { Payslip, IPayslip, IPayrollItem } from '../models/Payslip.js';
import { Employee, IEmployee } from '../models/Employee.js';
import { Attendance } from '../models/Attendance.js';

function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export class PayrollService {
  // Payroll Period Management
  async createPayrollPeriod(title: string, startDate: Date | string, endDate: Date | string): Promise<IPayrollPeriod> {
    const period = new PayrollPeriod({
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'draft',
      totalPaid: 0,
    });
    await period.save();
    await this.generatePayslipsForPeriod(period._id.toString());
    return period;
  }

  async getPayrollPeriods(): Promise<IPayrollPeriod[]> {
    return PayrollPeriod.find().populate('approvedBy').sort({ startDate: -1 });
  }

  async getPayrollPeriodById(id: string): Promise<IPayrollPeriod | null> {
    return PayrollPeriod.findById(id).populate('approvedBy');
  }

  async approvePayrollPeriod(id: string, approvedByUserId: string): Promise<IPayrollPeriod | null> {
    const period = await PayrollPeriod.findById(id);
    if (!period) throw new Error('Payroll period not found');
    if (period.status === 'paid') throw new Error('Payroll period is already paid');

    period.status = 'approved';
    period.approvedBy = approvedByUserId as any;
    await period.save();

    await Payslip.updateMany({ payrollPeriod: period._id }, { status: 'approved' });
    return period;
  }

  async payOutPayrollPeriod(id: string): Promise<IPayrollPeriod | null> {
    const period = await PayrollPeriod.findById(id);
    if (!period) throw new Error('Payroll period not found');
    if (period.status !== 'approved') throw new Error('Payroll period must be approved before paying out');

    const payslips = await Payslip.find({ payrollPeriod: period._id });
    const totalPaid = payslips.reduce((sum, p) => sum + p.netSalary, 0);

    period.status = 'paid';
    period.totalPaid = roundCurrency(totalPaid);
    period.paidAt = new Date();
    await period.save();

    await Payslip.updateMany(
      { payrollPeriod: period._id },
      { status: 'paid', paidAt: new Date() }
    );

    return period;
  }

  // Payslip Calculation & Generation
  async generatePayslipsForPeriod(payrollPeriodId: string): Promise<IPayslip[]> {
    const period = await PayrollPeriod.findById(payrollPeriodId);
    if (!period) throw new Error('Payroll period not found');

    const startDateStr = new Date(period.startDate).toISOString().split('T')[0];
    const endDateStr = new Date(period.endDate).toISOString().split('T')[0];

    const employees = await Employee.find({ isActive: true });
    const payslips: IPayslip[] = [];

    for (const emp of employees) {
      const attendanceLogs = await Attendance.find({
        employee: emp._id,
        date: { $gte: startDateStr, $lte: endDateStr },
      });

      const totalWorkedHours = attendanceLogs.reduce((sum, log) => sum + (log.workHours || 0), 0);
      const totalOvertimeHours = attendanceLogs.reduce((sum, log) => sum + (log.overtimeHours || 0), 0);

      let basicSalary = 0;
      let overtimeRate = 0;

      if (emp.salaryType === 'monthly') {
        basicSalary = emp.baseSalary;
        // Standard 160 working hours per month for hourly rate equivalent
        const hourlyEquivalent = emp.baseSalary > 0 ? emp.baseSalary / 160 : 0;
        overtimeRate = hourlyEquivalent * emp.overtimeMultiplier;
      } else {
        basicSalary = roundCurrency(totalWorkedHours * emp.hourlyRate);
        overtimeRate = emp.hourlyRate * emp.overtimeMultiplier;
      }

      const overtimePay = roundCurrency(totalOvertimeHours * overtimeRate);
      const defaultAllowances: IPayrollItem[] = [];
      const defaultDeductions: IPayrollItem[] = [];

      const allowanceTotal = defaultAllowances.reduce((sum, item) => sum + item.amount, 0);
      const deductionTotal = defaultDeductions.reduce((sum, item) => sum + item.amount, 0);
      const grossSalary = basicSalary + overtimePay + allowanceTotal;
      
      // Estimated 5% tax deduction for demonstration/standard rule
      const taxDeduction = roundCurrency(grossSalary * 0.05);

      const netSalary = roundCurrency(grossSalary - deductionTotal - taxDeduction);

      const payslipData = {
        payrollPeriod: period._id,
        employee: emp._id,
        employeeId: emp.employeeId,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        position: emp.position,
        salaryType: emp.salaryType,
        basicSalary,
        workedHours: roundCurrency(totalWorkedHours),
        overtimeHours: roundCurrency(totalOvertimeHours),
        overtimePay,
        allowances: defaultAllowances,
        allowanceTotal,
        bonus: 0,
        deductions: defaultDeductions,
        deductionTotal,
        taxDeduction,
        netSalary,
        status: period.status === 'paid' ? 'paid' : (period.status === 'approved' ? 'approved' : 'draft'),
      };

      const payslip = await Payslip.findOneAndUpdate(
        { payrollPeriod: period._id, employee: emp._id },
        payslipData,
        { upsert: true, new: true }
      );

      payslips.push(payslip);
    }

    return payslips;
  }

  async updatePayslip(
    payslipId: string,
    data: {
      allowances?: IPayrollItem[];
      bonus?: number;
      bonusNotes?: string;
      deductions?: IPayrollItem[];
      taxDeduction?: number;
      notes?: string;
    }
  ): Promise<IPayslip | null> {
    const payslip = await Payslip.findById(payslipId);
    if (!payslip) throw new Error('Payslip not found');
    if (payslip.status === 'paid') throw new Error('Paid payslips cannot be edited');

    if (data.allowances !== undefined) payslip.allowances = data.allowances;
    if (data.bonus !== undefined) payslip.bonus = data.bonus;
    if (data.bonusNotes !== undefined) payslip.bonusNotes = data.bonusNotes;
    if (data.deductions !== undefined) payslip.deductions = data.deductions;
    if (data.taxDeduction !== undefined) payslip.taxDeduction = data.taxDeduction;
    if (data.notes !== undefined) payslip.notes = data.notes;

    payslip.allowanceTotal = payslip.allowances.reduce((sum, item) => sum + item.amount, 0);
    payslip.deductionTotal = payslip.deductions.reduce((sum, item) => sum + item.amount, 0);

    const gross = payslip.basicSalary + payslip.overtimePay + payslip.allowanceTotal + payslip.bonus;
    payslip.netSalary = roundCurrency(gross - payslip.deductionTotal - payslip.taxDeduction);

    await payslip.save();
    return payslip;
  }

  async getPayslipsByPeriod(payrollPeriodId: string): Promise<IPayslip[]> {
    return Payslip.find({ payrollPeriod: payrollPeriodId }).populate('employee').sort({ employeeId: 1 });
  }

  async getPayslipById(id: string): Promise<IPayslip | null> {
    return Payslip.findById(id).populate('employee payrollPeriod');
  }

  // Salary Reports
  async getDepartmentSalaryReport(payrollPeriodId: string) {
    const payslips = await Payslip.find({ payrollPeriod: payrollPeriodId });
    const deptMap: Record<string, {
      department: string;
      employeeCount: number;
      basicSalary: number;
      overtimePay: number;
      allowances: number;
      bonuses: number;
      deductions: number;
      tax: number;
      netSalary: number;
    }> = {};

    for (const p of payslips) {
      const dept = p.department || 'General';
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          employeeCount: 0,
          basicSalary: 0,
          overtimePay: 0,
          allowances: 0,
          bonuses: 0,
          deductions: 0,
          tax: 0,
          netSalary: 0,
        };
      }

      deptMap[dept].employeeCount += 1;
      deptMap[dept].basicSalary += p.basicSalary;
      deptMap[dept].overtimePay += p.overtimePay;
      deptMap[dept].allowances += p.allowanceTotal;
      deptMap[dept].bonuses += p.bonus;
      deptMap[dept].deductions += p.deductionTotal;
      deptMap[dept].tax += p.taxDeduction;
      deptMap[dept].netSalary += p.netSalary;
    }

    return Object.values(deptMap).map(d => ({
      ...d,
      basicSalary: roundCurrency(d.basicSalary),
      overtimePay: roundCurrency(d.overtimePay),
      allowances: roundCurrency(d.allowances),
      bonuses: roundCurrency(d.bonuses),
      deductions: roundCurrency(d.deductions),
      tax: roundCurrency(d.tax),
      netSalary: roundCurrency(d.netSalary),
    }));
  }
}

export const payrollService = new PayrollService();
