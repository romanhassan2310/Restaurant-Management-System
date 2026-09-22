import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { Floor } from '../models/Floor.js';
import { Reservation } from '../models/Reservation.js';
import type { ReservationStatus } from '../models/Reservation.js';
import { RestaurantTable, type TableStatus } from '../models/RestaurantTable.js';
import { User } from '../models/User.js';
import { WaitlistEntry } from '../models/WaitlistEntry.js';
import { emitTableUpdated } from '../realtime/socket.js';

const operationalStatuses: TableStatus[] = ['available', 'reserved', 'occupied', 'cleaning'];

async function audit(action: string, entityId: string, userId: string, after: Record<string, unknown>) {
  await AuditLog.create({ user: userId, action, module: 'tables', entity: 'RestaurantTable', entityId, after });
}

async function getTable(id: string) {
  const table = await RestaurantTable.findById(id);
  if (!table) throw new AppError('Table not found', 404);
  return table;
}

export async function listFloors() {
  return Floor.find({ isActive: true }).sort({ name: 1 }).lean();
}

export async function listTables(filters: { floor?: string; status?: string; section?: string } = {}) {
  const query: Record<string, unknown> = { isActive: true };
  if (filters.floor) query.floor = filters.floor;
  if (filters.status) query.status = filters.status;
  if (filters.section) query.section = filters.section;
  return RestaurantTable.find(query).populate('floor assignedWaiter currentOrder').sort({ name: 1 }).lean();
}

export async function createTable(input: { name: string; capacity: number; floor: string; section?: string }, userId: string) {
  const floor = await Floor.findOne({ _id: input.floor, isActive: true });
  if (!floor) throw new AppError('Floor not found', 404);
  const table = await RestaurantTable.create({ ...input, floor: floor._id });
  await audit('table_created', String(table._id), userId, input);
  emitTableUpdated(table);
  return table;
}

export async function updateTableStatus(id: string, status: TableStatus, userId: string, guestCount?: number) {
  if (!operationalStatuses.includes(status)) throw new AppError('Invalid table status', 400);
  const table = await getTable(id);
  table.status = status;
  if (guestCount !== undefined) {
    if (!Number.isInteger(guestCount) || guestCount < 0 || guestCount > table.capacity) throw new AppError('Guest count exceeds table capacity', 400);
    table.guestCount = guestCount;
  }
  if (status === 'available' || status === 'cleaning') {
    table.currentOrder = undefined;
    table.guestCount = 0;
    if (status === 'available') table.assignedWaiter = undefined;
  }
  await table.save();
  await audit('table_status_changed', id, userId, { status, guestCount: table.guestCount });
  emitTableUpdated(table);
  return table;
}

export async function assignTable(tableId: string, waiterId: string, guestCount: number, orderId: string | undefined, userId: string) {
  const waiter = await User.findOne({ _id: waiterId, isActive: true });
  if (!waiter) throw new AppError('Waiter not found', 404);
  const table = await getTable(tableId);
  if (guestCount < 1 || guestCount > table.capacity) throw new AppError('Guest count exceeds table capacity', 400);
  if (table.status === 'occupied' && table.currentOrder && String(table.currentOrder) !== orderId) throw new AppError('Table is already occupied', 409);
  table.assignedWaiter = waiter._id;
  table.guestCount = guestCount;
  table.currentOrder = orderId ? new mongoose.Types.ObjectId(orderId) : table.currentOrder;
  table.status = 'occupied';
  await table.save();
  await audit('table_assigned', tableId, userId, { waiterId, guestCount, orderId });
  emitTableUpdated(table);
  return table;
}

export async function transferTable(fromId: string, toId: string, userId: string) {
  if (fromId === toId) throw new AppError('Source and destination tables must differ', 400);
  const session = await mongoose.startSession();
  try {
    let destination!: typeof RestaurantTable.prototype;
    await session.withTransaction(async () => {
      const source = await RestaurantTable.findById(fromId).session(session);
      destination = await RestaurantTable.findById(toId).session(session) as typeof RestaurantTable.prototype;
      if (!source || !destination) throw new AppError('Table not found', 404);
      if (!source.currentOrder) throw new AppError('Source table has no active order', 409);
      if (destination.status === 'occupied' || destination.status === 'cleaning') throw new AppError('Destination table is unavailable', 409);
      destination.currentOrder = source.currentOrder;
      destination.assignedWaiter = source.assignedWaiter;
      destination.guestCount = source.guestCount;
      destination.status = 'occupied';
      source.currentOrder = undefined;
      source.assignedWaiter = undefined;
      source.guestCount = 0;
      source.status = 'cleaning';
      await source.save({ session });
      await destination.save({ session });
      await AuditLog.create([{ user: userId, action: 'table_transferred', module: 'tables', entity: 'RestaurantTable', entityId: fromId, after: { toId } }], { session });
      emitTableUpdated(source);
    });
    emitTableUpdated(destination);
    return destination;
  } finally { await session.endSession(); }
}

export async function mergeTables(tableIds: string[], userId: string) {
  if (tableIds.length < 2) throw new AppError('At least two tables are required to merge', 400);
  const tables = await RestaurantTable.find({ _id: { $in: tableIds } });
  if (tables.length !== tableIds.length) throw new AppError('One or more tables not found', 404);
  const occupied = tables.filter((table) => table.status === 'occupied');
  if (occupied.length > 1) throw new AppError('Only one table in a merge may have an active order', 409);
  const target = occupied[0] ?? tables[0];
  const guestCount = tables.reduce((sum, table) => sum + table.guestCount, 0);
  if (guestCount > target.capacity) throw new AppError('Merged guest count exceeds target capacity', 400);
  for (const table of tables) {
    if (table._id.equals(target._id)) continue;
    table.status = 'cleaning';
    table.guestCount = 0;
    table.assignedWaiter = undefined;
    table.currentOrder = undefined;
    await table.save();
    emitTableUpdated(table);
  }
  target.status = 'occupied';
  target.guestCount = guestCount;
  await target.save();
  await audit('tables_merged', String(target._id), userId, { tableIds });
  emitTableUpdated(target);
  return target;
}

export async function createWaitlistEntry(input: { customer: string; guestCount: number; notes?: string }, userId: string) {
  const entry = await WaitlistEntry.create({ ...input, createdBy: userId });
  return entry.populate('customer');
}

export async function listWaitlist() {
  return WaitlistEntry.find({ status: 'waiting' }).populate('customer assignedTable').sort({ requestedAt: 1 }).lean();
}

export async function seatWaitlistEntry(id: string, tableId: string, userId: string) {
  const entry = await WaitlistEntry.findOne({ _id: id, status: 'waiting' });
  if (!entry) throw new AppError('Waitlist entry not found', 404);
  const table = await getTable(tableId);
  if (table.status !== 'available' || table.capacity < entry.guestCount) throw new AppError('Table is not suitable for this waitlist entry', 409);
  entry.status = 'seated';
  entry.assignedTable = table._id;
  await entry.save();
  await updateTableStatus(tableId, 'occupied', userId, entry.guestCount);
  return entry;
}

export async function createReservation(input: { customer: string; date: Date; time: string; guestCount: number; table?: string; notes?: string }, userId: string) {
  if (input.table) {
    const table = await getTable(input.table);
    if (table.capacity < input.guestCount) throw new AppError('Guest count exceeds table capacity', 400);
    const conflict = await Reservation.exists({ table: input.table, date: input.date, time: input.time, status: { $in: ['pending', 'confirmed', 'seated'] } });
    if (conflict) throw new AppError('Table is already reserved for that time', 409);
  }
  const reservation = await Reservation.create({ ...input, createdBy: userId });
  if (input.table) {
    await RestaurantTable.findByIdAndUpdate(input.table, { status: 'reserved' });
    emitTableUpdated(await getTable(input.table));
  }
  return reservation.populate('customer table');
}

export async function listReservations(filters: { date?: Date; status?: string } = {}) {
  const query: Record<string, unknown> = {};
  if (filters.date) query.date = filters.date;
  if (filters.status) query.status = filters.status;
  return Reservation.find(query).populate('customer table').sort({ date: 1, time: 1 }).lean();
}

export async function updateReservation(id: string, input: Partial<{ status: ReservationStatus; table: string; guestCount: number; notes: string }>, userId: string) {
  const reservation = await Reservation.findById(id);
  if (!reservation) throw new AppError('Reservation not found', 404);
  if (input.table && input.table !== String(reservation.table)) {
    const table = await getTable(input.table);
    const conflict = await Reservation.exists({ _id: { $ne: id }, table: input.table, date: reservation.date, time: reservation.time, status: { $in: ['pending', 'confirmed', 'seated'] } });
    if (conflict) throw new AppError('Table is already reserved for that time', 409);
    reservation.table = table._id;
  }
  if (input.status) reservation.status = input.status;
  if (input.guestCount !== undefined) reservation.guestCount = input.guestCount;
  if (input.notes !== undefined) reservation.notes = input.notes;
  await reservation.save();
  await audit('reservation_updated', id, userId, { status: reservation.status, table: reservation.table });
  return reservation.populate('customer table');
}
