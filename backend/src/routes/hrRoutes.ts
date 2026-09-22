import { Router } from 'express';
import { hrController } from '../controllers/hrController.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Employee Management
router.get('/employees', requirePermission('hr.view'), (req, res) => hrController.getEmployees(req, res));
router.post('/employees', requirePermission('hr.manage'), (req, res) => hrController.createEmployee(req, res));
router.get('/employees/:id', requirePermission('hr.view'), (req, res) => hrController.getEmployeeById(req, res));
router.put('/employees/:id', requirePermission('hr.manage'), (req, res) => hrController.updateEmployee(req, res));
router.delete('/employees/:id', requirePermission('hr.manage'), (req, res) => hrController.deleteEmployee(req, res));

// Attendance Management
router.post('/attendance/check-in', requirePermission('attendance.manage'), (req, res) => hrController.recordCheckIn(req, res));
router.post('/attendance/check-out', requirePermission('attendance.manage'), (req, res) => hrController.recordCheckOut(req, res));
router.get('/attendance', requirePermission('hr.view'), (req, res) => hrController.getAttendance(req, res));

// Shift Scheduling
router.get('/shifts', requirePermission('hr.view'), (req, res) => hrController.getShiftSchedules(req, res));
router.post('/shifts', requirePermission('hr.manage'), (req, res) => hrController.createShiftSchedule(req, res));
router.delete('/shifts/:id', requirePermission('hr.manage'), (req, res) => hrController.deleteShiftSchedule(req, res));

export const hrRoutes = router;
