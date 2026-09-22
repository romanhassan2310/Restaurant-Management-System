import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IEmployeeBankDetails {
  bankName?: string;
  accountNumber?: string;
  iban?: string;
}

export interface IEmployee extends Document {
  employeeId: string;
  user?: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  position: string;
  department: string;
  role?: Types.ObjectId;
  joinDate: Date;
  salaryType: 'monthly' | 'hourly';
  baseSalary: number;
  hourlyRate: number;
  overtimeMultiplier: number;
  bankDetails?: IEmployeeBankDetails;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>({
  employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  position: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  role: { type: Schema.Types.ObjectId, ref: 'Role' },
  joinDate: { type: Date, default: Date.now },
  salaryType: { type: String, enum: ['monthly', 'hourly'], default: 'monthly' },
  baseSalary: { type: Number, default: 0, min: 0 },
  hourlyRate: { type: Number, default: 0, min: 0 },
  overtimeMultiplier: { type: Number, default: 1.5, min: 1.0 },
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    iban: { type: String, trim: true },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ department: 1, position: 1 });

export const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);
