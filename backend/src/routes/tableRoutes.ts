import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { Floor } from '../models/Floor.js';
import { RestaurantTable } from '../models/RestaurantTable.js';
import { assignTable, createReservation, createTable, createWaitlistEntry, listFloors, listReservations, listTables, listWaitlist, mergeTables, seatWaitlistEntry, transferTable, updateReservation, updateTableStatus } from '../services/tableService.js';
import { generateTableQr } from '../services/qrService.js';

const router = Router();
router.use(requireAuth);

const id = z.string().min(1);
const floorSchema = z.object({ name: z.string().min(2), code: z.string().min(1), sections: z.array(z.string()).optional() });
const tableSchema = z.object({ name: z.string().min(1), capacity: z.number().int().positive(), floor: id, section: z.string().optional() });
const assignmentSchema = z.object({ waiterId: id, guestCount: z.number().int().positive(), orderId: id.optional() });
const statusSchema = z.object({ status: z.enum(['available', 'reserved', 'occupied', 'cleaning']), guestCount: z.number().int().min(0).optional() });
const transferSchema = z.object({ toTableId: id });
const mergeSchema = z.object({ tableIds: z.array(id).min(2) });
const waitlistSchema = z.object({ customer: id, guestCount: z.number().int().positive(), notes: z.string().optional() });
const reservationSchema = z.object({ customer: id, date: z.coerce.date(), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), guestCount: z.number().int().positive(), table: id.optional(), notes: z.string().optional() });
const reservationUpdateSchema = z.object({ status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show']).optional(), table: id.optional(), guestCount: z.number().int().positive().optional(), notes: z.string().optional() });

function userId(req: AuthenticatedRequest): string { return req.user!.id; }

router.get('/floors', requirePermission('table.view'), async (_req, res, next) => { try { res.json({ success: true, data: await listFloors() }); } catch (error) { next(error); } });
router.post('/floors', requirePermission('table.manage'), validateBody(floorSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await Floor.create(req.body) }); } catch (error) { next(error); } });
router.get('/', requirePermission('table.view'), async (req, res, next) => { try { res.json({ success: true, data: await listTables({ floor: typeof req.query.floor === 'string' ? req.query.floor : undefined, status: typeof req.query.status === 'string' ? req.query.status : undefined, section: typeof req.query.section === 'string' ? req.query.section : undefined }) }); } catch (error) { next(error); } });
router.post('/', requirePermission('table.manage'), validateBody(tableSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await createTable(req.body, userId(req)) }); } catch (error) { next(error); } });
router.post('/:id/qr', requirePermission('table.manage'), async (req, res, next) => { try { res.json({ success: true, data: await generateTableQr(String(req.params.id)) }); } catch (error) { next(error); } });
router.patch('/:id/status', requirePermission('table.manage'), validateBody(statusSchema), async (req: AuthenticatedRequest, res, next) => { try { res.json({ success: true, data: await updateTableStatus(String(req.params.id), req.body.status, userId(req), req.body.guestCount) }); } catch (error) { next(error); } });
router.post('/:id/assign', requirePermission('table.assign'), validateBody(assignmentSchema), async (req: AuthenticatedRequest, res, next) => { try { res.json({ success: true, data: await assignTable(String(req.params.id), req.body.waiterId, req.body.guestCount, req.body.orderId, userId(req)) }); } catch (error) { next(error); } });
router.post('/merge', requirePermission('table.assign'), validateBody(mergeSchema), async (req: AuthenticatedRequest, res, next) => { try { res.json({ success: true, data: await mergeTables(req.body.tableIds, userId(req)) }); } catch (error) { next(error); } });
router.post('/:id/transfer', requirePermission('table.assign'), validateBody(transferSchema), async (req: AuthenticatedRequest, res, next) => { try { res.json({ success: true, data: await transferTable(String(req.params.id), req.body.toTableId, userId(req)) }); } catch (error) { next(error); } });

router.get('/waitlist', requirePermission('reservation.view'), async (_req, res, next) => { try { res.json({ success: true, data: await listWaitlist() }); } catch (error) { next(error); } });
router.post('/waitlist', requirePermission('reservation.manage'), validateBody(waitlistSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await createWaitlistEntry(req.body, userId(req)) }); } catch (error) { next(error); } });
router.post('/waitlist/:id/seat', requirePermission('reservation.manage'), validateBody(z.object({ tableId: id })), async (req: AuthenticatedRequest, res, next) => { try { res.json({ success: true, data: await seatWaitlistEntry(String(req.params.id), req.body.tableId, userId(req)) }); } catch (error) { next(error); } });

router.get('/reservations', requirePermission('reservation.view'), async (req, res, next) => { try { res.json({ success: true, data: await listReservations({ date: typeof req.query.date === 'string' ? new Date(req.query.date) : undefined, status: typeof req.query.status === 'string' ? req.query.status : undefined }) }); } catch (error) { next(error); } });
router.post('/reservations', requirePermission('reservation.manage'), validateBody(reservationSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await createReservation(req.body, userId(req)) }); } catch (error) { next(error); } });
router.patch('/reservations/:id', requirePermission('reservation.manage'), validateBody(reservationUpdateSchema), async (req: AuthenticatedRequest, res, next) => { try { res.json({ success: true, data: await updateReservation(String(req.params.id), req.body, userId(req)) }); } catch (error) { next(error); } });

export default router;
