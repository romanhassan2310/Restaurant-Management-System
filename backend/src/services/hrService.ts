import { Employee, IEmployee } from '../models/Employee.js';
import { Attendance, IAttendance } from '../models/Attendance.js';
import { ShiftSchedule, IShiftSchedule } from '../models/ShiftSchedule.js';

export class HrService {
  // Employee Management
  async createEmployee(data: Partial<IEmployee>): Promise<IEmployee> {
    if (!data.employeeId) {
      const count = await Employee.countDocuments();
      data.employeeId = `EMP-${(count + 1001).toString()}`;
    }
    const employee = new Employee(data);
    return employee.save();
  }

  async getEmployees(filter: { department?: string; position?: string; search?: string; isActive?: boolean }) {
    const query: any = {};
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.department) query.department = filter.department;
    if (filter.position) query.position = filter.position;
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ firstName: regex }, { lastName: regex }, { employeeId: regex }, { email: regex }];
    }
    return Employee.find(query).populate('user role').sort({ employeeId: 1 });
  }

  async getEmployeeById(id: string): Promise<IEmployee | null> {
    return Employee.findById(id).populate('user role');
  }

  async updateEmployee(id: string, data: Partial<IEmployee>): Promise<IEmployee | null> {
    return Employee.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const res = await Employee.findByIdAndUpdate(id, { isActive: false });
    return !!res;
  }

  // Attendance Management
  async recordCheckIn(employeeId: string, checkInTime?: Date, notes?: string): Promise<IAttendance> {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error('Employee not found');

    const now = checkInTime || new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Check if shift is scheduled for today
    const scheduledShift = await ShiftSchedule.findOne({ employee: employee._id, date: dateStr });

    let status: 'present' | 'late' = 'present';
    let lateMinutes = 0;

    if (scheduledShift) {
      // Parse shift start time (e.g., "08:00")
      const [startHour, startMin] = scheduledShift.startTime.split(':').map(Number);
      const shiftStart = new Date(now);
      shiftStart.setHours(startHour, startMin, 0, 0);

      if (now > shiftStart) {
        lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / (1000 * 60));
        if (lateMinutes > 5) { // 5 mins grace period
          status = 'late';
        }
      }
    }

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: dateStr },
      {
        $setOnInsert: {
          employee: employee._id,
          date: dateStr,
          checkIn: now,
          scheduledShift: scheduledShift?._id,
          status,
          lateMinutes,
          notes,
        },
      },
      { upsert: true, new: true }
    );

    return attendance;
  }

  async recordCheckOut(employeeId: string, checkOutTime?: Date, notes?: string): Promise<IAttendance> {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error('Employee not found');

    const now = checkOutTime || new Date();
    const dateStr = now.toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ employee: employee._id, date: dateStr });
    if (!attendance || !attendance.checkIn) {
      throw new Error('No check-in record found for today');
    }

    attendance.checkOut = now;
    if (notes) attendance.notes = (attendance.notes ? attendance.notes + '; ' : '') + notes;

    // Calculate work hours and overtime
    const checkIn = new Date(attendance.checkIn);
    const totalMs = now.getTime() - checkIn.getTime();
    const workHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;

    attendance.workHours = workHours;
    if (workHours > 8) {
      attendance.overtimeHours = Math.round((workHours - 8) * 100) / 100;
    } else {
      attendance.overtimeHours = 0;
    }

    // Check early leave if scheduled shift exists
    if (attendance.scheduledShift) {
      const scheduledShift = await ShiftSchedule.findById(attendance.scheduledShift);
      if (scheduledShift) {
        const [endHour, endMin] = scheduledShift.endTime.split(':').map(Number);
        const shiftEnd = new Date(now);
        shiftEnd.setHours(endHour, endMin, 0, 0);

        if (now < shiftEnd) {
          const earlyLeave = Math.floor((shiftEnd.getTime() - now.getTime()) / (1000 * 60));
          if (earlyLeave > 5) {
            attendance.earlyLeaveMinutes = earlyLeave;
            if (attendance.status === 'present') {
              attendance.status = 'early_leave';
            }
          }
        }
      }
    }

    await attendance.save();
    return attendance;
  }

  async getAttendance(filter: { employeeId?: string; startDate?: string; endDate?: string; status?: string }) {
    const query: any = {};
    if (filter.employeeId) query.employee = filter.employeeId;
    if (filter.status) query.status = filter.status;
    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = filter.startDate;
      if (filter.endDate) query.date.$lte = filter.endDate;
    }
    return Attendance.find(query).populate('employee scheduledShift').sort({ date: -1 });
  }

  // Shift Scheduling
  async createShiftSchedule(data: Partial<IShiftSchedule>): Promise<IShiftSchedule> {
    const shift = new ShiftSchedule(data);
    return shift.save();
  }

  async getShiftSchedules(filter: { employeeId?: string; startDate?: string; endDate?: string }) {
    const query: any = {};
    if (filter.employeeId) query.employee = filter.employeeId;
    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = filter.startDate;
      if (filter.endDate) query.date.$lte = filter.endDate;
    }
    return ShiftSchedule.find(query).populate('employee').sort({ date: 1, startTime: 1 });
  }

  async deleteShiftSchedule(id: string): Promise<boolean> {
    const res = await ShiftSchedule.findByIdAndDelete(id);
    return !!res;
  }
}

export const hrService = new HrService();
