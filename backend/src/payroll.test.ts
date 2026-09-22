import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { User } from './models/User.js';
import { Role } from './models/Role.js';
import { Employee } from './models/Employee.js';
import { Attendance } from './models/Attendance.js';
import { ShiftSchedule } from './models/ShiftSchedule.js';
import { PayrollPeriod } from './models/PayrollPeriod.js';
import { Payslip } from './models/Payslip.js';
import { AuditLog } from './models/AuditLog.js';

let replSet: MongoMemoryReplSet;
let authToken: string;
let userId: string;
let monthlyEmpId: string;
let hourlyEmpId: string;
let periodId: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());

  const role = await Role.create({ name: 'HR Admin', code: 'hr_admin', permissions: [] });
  const user = await User.create({
    firstName: 'HR',
    lastName: 'Manager',
    email: 'hr@example.com',
    passwordHash: 'hashedpassword',
    roles: [role._id],
    isActive: true,
  });
  userId = String(user._id);

  const { signAccessToken } = await import('./utils/jwt.js');
  authToken = signAccessToken({
    sub: userId,
    email: 'hr@example.com',
    roleIds: [String(role._id)],
    permissionKeys: ['hr.view', 'hr.manage', 'attendance.manage', 'payroll.view', 'payroll.manage', '*'],
  });
});

afterAll(async () => {
  await mongoose.connection.close();
  await replSet.stop();
});

describe('HR Management & Payroll Calculations', () => {
  it('creates employee profiles with monthly and hourly compensation settings', async () => {
    // 1. Create Monthly Employee
    const res1 = await request(app)
      .post('/api/hr/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employeeId: 'EMP-M01',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@restaurant.com',
        position: 'Head Chef',
        department: 'Kitchen',
        salaryType: 'monthly',
        baseSalary: 4000,
        overtimeMultiplier: 1.5,
      });
    expect(res1.status).toBe(201);
    monthlyEmpId = res1.body._id;

    // 2. Create Hourly Employee
    const res2 = await request(app)
      .post('/api/hr/employees')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employeeId: 'EMP-H01',
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@restaurant.com',
        position: 'Waiter',
        department: 'Front of House',
        salaryType: 'hourly',
        hourlyRate: 20,
        overtimeMultiplier: 1.5,
      });
    expect(res2.status).toBe(201);
    hourlyEmpId = res2.body._id;

    // Verify audit log creation
    const auditCount = await AuditLog.countDocuments({ module: 'hr', action: 'employee_created' });
    expect(auditCount).toBe(2);
  });

  it('schedules shifts and records attendance check-in and check-out with late and overtime tracking', async () => {
    const today = new Date().toISOString().split('T')[0];

    // Schedule shift for Bob (Hourly)
    const shiftRes = await request(app)
      .post('/api/hr/shifts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employee: hourlyEmpId,
        date: today,
        startTime: '08:00',
        endTime: '16:00',
        shiftType: 'morning',
      });
    expect(shiftRes.status).toBe(201);

    // Record check-in for Bob at 08:30 (Late by 30 mins)
    const checkInTime = new Date();
    checkInTime.setHours(8, 30, 0, 0);

    const checkInRes = await request(app)
      .post('/api/hr/attendance/check-in')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employeeId: hourlyEmpId,
        checkInTime: checkInTime.toISOString(),
      });
    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body.status).toBe('late');
    expect(checkInRes.body.lateMinutes).toBe(30);

    // Record check-out after 10 hours worked (08:30 to 18:30 -> 10 hrs = 8 std + 2 overtime)
    const checkOutTime = new Date();
    checkOutTime.setHours(18, 30, 0, 0);

    const checkOutRes = await request(app)
      .post('/api/hr/attendance/check-out')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employeeId: hourlyEmpId,
        checkOutTime: checkOutTime.toISOString(),
      });
    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.workHours).toBe(10);
    expect(checkOutRes.body.overtimeHours).toBe(2);
  });

  it('generates payroll period and calculates net salary math accurately', async () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Create Payroll Period
    const periodRes = await request(app)
      .post('/api/hr/payroll/periods')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Monthly Cycle',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    expect(periodRes.status).toBe(201);
    periodId = periodRes.body._id;

    // Fetch generated payslips
    const payslipsRes = await request(app)
      .get(`/api/hr/payroll/periods/${periodId}/payslips`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(payslipsRes.status).toBe(200);
    expect(payslipsRes.body.length).toBe(2);

    // Verify Bob (Hourly employee: 10 hrs * $20 = $200 basic + 2 hrs overtime * $20 * 1.5 = $60 overtime = $260 gross - 5% tax ($13) = $247 Net)
    const bobPayslip = payslipsRes.body.find((p: any) => p.employeeName === 'Bob Jones');
    expect(bobPayslip).toBeTruthy();
    expect(bobPayslip.basicSalary).toBe(200);
    expect(bobPayslip.overtimeHours).toBe(2);
    expect(bobPayslip.overtimePay).toBe(60);
    expect(bobPayslip.taxDeduction).toBe(13);
    expect(bobPayslip.netSalary).toBe(247);
  });

  it('allows updating payslips with custom bonus and allowances and recalculates net salary', async () => {
    const payslipsRes = await request(app)
      .get(`/api/hr/payroll/periods/${periodId}/payslips`)
      .set('Authorization', `Bearer ${authToken}`);
    const bobPayslip = payslipsRes.body.find((p: any) => p.employeeName === 'Bob Jones');

    // Add $50 bonus & $20 transport allowance
    const updateRes = await request(app)
      .put(`/api/hr/payroll/payslips/${bobPayslip._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bonus: 50,
        bonusNotes: 'Performance Award',
        allowances: [{ name: 'Transport', amount: 20 }],
      });

    expect(updateRes.status).toBe(200);
    // New Gross: Basic(200) + Overtime(60) + Allowance(20) + Bonus(50) = 330
    // Net: 330 - Tax(13) = 317
    expect(updateRes.body.allowanceTotal).toBe(20);
    expect(updateRes.body.bonus).toBe(50);
    expect(updateRes.body.netSalary).toBe(317);
  });

  it('approves payroll period, executes payout, and generates department salary reports', async () => {
    // 1. Approve
    const approveRes = await request(app)
      .post(`/api/hr/payroll/periods/${periodId}/approve`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('approved');

    // 2. Payout
    const payoutRes = await request(app)
      .post(`/api/hr/payroll/periods/${periodId}/payout`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(payoutRes.status).toBe(200);
    expect(payoutRes.body.status).toBe('paid');
    expect(payoutRes.body.totalPaid).toBeGreaterThan(0);

    // 3. Department Salary Report
    const reportRes = await request(app)
      .get(`/api/hr/payroll/periods/${periodId}/reports`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.some((r: any) => r.department === 'Front of House')).toBe(true);
    expect(reportRes.body.some((r: any) => r.department === 'Kitchen')).toBe(true);
  });
});
