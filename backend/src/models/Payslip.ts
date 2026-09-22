import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IPayrollItem {
  name: string;
  amount: number;
}

export interface IPayslip extends Document {
  payrollPeriod: Types.ObjectId;
  employee: Types.ObjectId;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  salaryType: 'monthly' | 'hourly';
  basicSalary: number;
  workedHours: number;
  overtimeHours: number;
  overtimePay: number;
  allowances: IPayrollItem[];
  allowanceTotal: number;
  bonus: number;
  bonusNotes?: string;
  deductions: IPayrollItem[];
  deductionTotal: number;
  taxDeduction: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
  paymentMethod: 'bank_transfer' | 'cash' | 'check';
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const payrollItemSchema = new Schema<IPayrollItem>({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const payslipSchema = new Schema<IPayslip>({
  payrollPeriod: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeId: { type: String, required: true, uppercase: true, trim: true },
  employeeName: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  position: { type: String, required: true, trim: true },
  salaryType: { type: String, enum: ['monthly', 'hourly'], required: true },
  basicSalary: { type: Number, required: true, min: 0 },
  workedHours: { type: Number, default: 0, min: 0 },
  overtimeHours: { type: Number, default: 0, min: 0 },
  overtimePay: { type: Number, default: 0, min: 0 },
  allowances: { type: [payrollItemSchema], default: [] },
  allowanceTotal: { type: Number, default: 0, min: 0 },
  bonus: { type: Number, default: 0, min: 0 },
  bonusNotes: { type: String, trim: true },
  deductions: { type: [payrollItemSchema], default: [] },
  deductionTotal: { type: Number, default: 0, min: 0 },
  taxDeduction: { type: Number, default: 0, min: 0 },
  netSalary: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
  paymentMethod: { type: String, enum: ['bank_transfer', 'cash', 'check'], default: 'bank_transfer' },
  paidAt: { type: Date },
  notes: { type: String, trim: true },
}, { timestamps: true });

payslipSchema.index({ payrollPeriod: 1, employee: 1 }, { unique: true });

export const Payslip = mongoose.model<IPayslip>('Payslip', payslipSchema);
