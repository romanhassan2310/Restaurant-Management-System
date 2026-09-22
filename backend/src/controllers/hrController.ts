import { Request, Response } from 'express';
import { hrService } from '../services/hrService.js';
import { AuditLog } from '../models/AuditLog.js';

export class HrController {
  // Employees
  async getEmployees(req: Request, res: Response) {
    try {
      const { department, position, search, isActive } = req.query;
      const employees = await hrService.getEmployees({
        department: department as string,
        position: position as string,
        search: search as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });
      res.json(employees);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getEmployeeById(req: Request, res: Response) {
    try {
      const employee = await hrService.getEmployeeById(String(req.params.id));
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      res.json(employee);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async createEmployee(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const employee = await hrService.createEmployee(req.body);
      await AuditLog.create({
        user: userId,
        action: 'employee_created',
        module: 'hr',
        entity: 'Employee',
        entityId: String(employee._id),
        after: req.body,
      });
      res.status(201).json(employee);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async updateEmployee(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const employee = await hrService.updateEmployee(String(req.params.id), req.body);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      await AuditLog.create({
        user: userId,
        action: 'employee_updated',
        module: 'hr',
        entity: 'Employee',
        entityId: String(employee._id),
        after: req.body,
      });
      res.json(employee);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async deleteEmployee(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const success = await hrService.deleteEmployee(String(req.params.id));
      await AuditLog.create({
        user: userId,
        action: 'employee_deleted',
        module: 'hr',
        entity: 'Employee',
        entityId: String(req.params.id),
      });
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Attendance
  async recordCheckIn(req: Request, res: Response) {
    try {
      const { employeeId, checkInTime, notes } = req.body;
      const attendance = await hrService.recordCheckIn(
        employeeId,
        checkInTime ? new Date(checkInTime) : undefined,
        notes
      );
      res.status(201).json(attendance);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async recordCheckOut(req: Request, res: Response) {
    try {
      const { employeeId, checkOutTime, notes } = req.body;
      const attendance = await hrService.recordCheckOut(
        employeeId,
        checkOutTime ? new Date(checkOutTime) : undefined,
        notes
      );
      res.json(attendance);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getAttendance(req: Request, res: Response) {
    try {
      const { employeeId, startDate, endDate, status } = req.query;
      const attendance = await hrService.getAttendance({
        employeeId: employeeId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as string,
      });
      res.json(attendance);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Shift Schedules
  async createShiftSchedule(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const shift = await hrService.createShiftSchedule({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(shift);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getShiftSchedules(req: Request, res: Response) {
    try {
      const { employeeId, startDate, endDate } = req.query;
      const shifts = await hrService.getShiftSchedules({
        employeeId: employeeId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json(shifts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async deleteShiftSchedule(req: Request, res: Response) {
    try {
      const success = await hrService.deleteShiftSchedule(String(req.params.id));
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const hrController = new HrController();
