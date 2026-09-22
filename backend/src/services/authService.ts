import crypto from 'crypto';
import type { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { Permission } from '../models/Permission.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
  permissionKeys: string[];
  branchIds: string[];
}

export async function findUserByEmail(email: string) {
  return User.findOne({ email: email.toLowerCase() }).populate('roles');
}

export async function buildAuthenticatedUser(user: any): Promise<AuthenticatedUser> {
  const roles = await Role.find({ _id: { $in: user.roles } }).populate('permissions');
  const permissionKeys = new Set<string>();
  for (const role of roles) {
    for (const permission of role.permissions as any[]) {
      permissionKeys.add(permission.key);
    }
  }

  return {
    id: String(user._id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleIds: user.roles.map((role: Types.ObjectId) => String(role)),
    permissionKeys: [...permissionKeys],
    branchIds: user.branchIds.map((branchId: Types.ObjectId) => String(branchId)),
  };
}

export async function loginUser(email: string, password: string, ipAddress?: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    await AuditLog.create({
      action: 'login_failed',
      module: 'auth',
      entity: 'User',
      entityId: String(user._id),
      ipAddress,
    });
    throw new Error('Invalid credentials');
  }

  const authUser = await buildAuthenticatedUser(user);
  const accessToken = signAccessToken({
    sub: authUser.id,
    email: authUser.email,
    roleIds: authUser.roleIds,
    permissionKeys: authUser.permissionKeys,
    branchIds: authUser.branchIds,
  });
  const refreshToken = signRefreshToken({
    sub: authUser.id,
    email: authUser.email,
    roleIds: authUser.roleIds,
    permissionKeys: authUser.permissionKeys,
    branchIds: authUser.branchIds,
  });

  user.refreshTokenHash = await hashPassword(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();

  await AuditLog.create({
    user: user._id,
    action: 'login',
    module: 'auth',
    entity: 'User',
    entityId: String(user._id),
    ipAddress,
  });

  return { user: authUser, accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string, ipAddress?: string) {
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new Error('Invalid refresh token');
  }

  const validRefreshToken = await comparePassword(refreshToken, user.refreshTokenHash || '');
  if (!validRefreshToken) {
    throw new Error('Invalid refresh token');
  }

  const authUser = await buildAuthenticatedUser(user);
  const newAccessToken = signAccessToken({
    sub: authUser.id,
    email: authUser.email,
    roleIds: authUser.roleIds,
    permissionKeys: authUser.permissionKeys,
    branchIds: authUser.branchIds,
  });

  await AuditLog.create({
    user: user._id,
    action: 'refresh_token',
    module: 'auth',
    entity: 'User',
    entityId: String(user._id),
    ipAddress,
  });

  return { accessToken: newAccessToken };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, ipAddress?: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  user.refreshTokenHash = undefined;
  await user.save();

  await AuditLog.create({
    user: user._id,
    action: 'password_change',
    module: 'auth',
    entity: 'User',
    entityId: String(user._id),
    ipAddress,
  });
}

export async function issuePasswordResetToken(email: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = resetToken;
  user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  await AuditLog.create({
    user: user._id,
    action: 'password_reset_requested',
    module: 'auth',
    entity: 'User',
    entityId: String(user._id),
  });

  return { email: user.email, token: resetToken };
}

export async function resetPassword(token: string, newPassword: string, ipAddress?: string) {
  const user = await User.findOne({ passwordResetToken: token, passwordResetExpiresAt: { $gt: new Date() } });
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshTokenHash = undefined;
  await user.save();

  await AuditLog.create({
    user: user._id,
    action: 'password_reset',
    module: 'auth',
    entity: 'User',
    entityId: String(user._id),
    ipAddress,
  });
}

export async function logoutUser(userId: string, ipAddress?: string) {
  const user = await User.findById(userId);
  if (!user) return;

  user.refreshTokenHash = undefined;
  await user.save();

  await AuditLog.create({
    user: user._id,
    action: 'logout',
    module: 'auth',
    entity: 'User',
    entityId: String(user._id),
    ipAddress,
  });
}

export async function seedDefaultPermissions() {
  const defaults = [
    'users.view', 'users.create', 'users.update', 'users.delete',
    'inventory.view', 'inventory.manage', 'inventory.adjust', 'inventory.transfer', 'inventory.audit',
    'pos.view', 'pos.create', 'pos.manage', 'pos.void', 'pos.refund',
    'payment.view', 'payment.create', 'payment.refund',
    'receipt.view', 'receipt.print', 'receipt.manage', 'invoice.view',
    'shift.view', 'shift.manage', 'shift.close',
    'kitchen.view', 'kitchen.manage',
    'table.view', 'table.manage', 'table.assign', 'reservation.view', 'reservation.manage',
    'purchase.view', 'purchase.manage', 'purchase.approve', 'purchase.receive', 'purchase.return', 'purchase.report', 'supplier.payment',
  ];

  for (const key of defaults) {
    await Permission.findOneAndUpdate(
      { key },
      { $setOnInsert: { key, description: key } },
      { upsert: true, new: true },
    );
  }
}

export async function seedDefaultRoles() {
  const permissions = await Permission.find({});
  const roleMap = [
    { name: 'Super Admin', code: 'super_admin' },
    { name: 'Admin', code: 'admin' },
    { name: 'Manager', code: 'manager' },
    { name: 'Cashier', code: 'cashier' },
    { name: 'Waiter', code: 'waiter' },
    { name: 'Chef/Kitchen', code: 'chef_kitchen' },
    { name: 'Inventory Manager', code: 'inventory_manager' },
    { name: 'Purchase Manager', code: 'purchase_manager' },
    { name: 'HR Manager', code: 'hr_manager' },
    { name: 'Accountant', code: 'accountant' },
    { name: 'Delivery Driver', code: 'delivery_driver' },
  ];

  for (const item of roleMap) {
    await Role.findOneAndUpdate(
      { code: item.code },
      { $set: { name: item.name, permissions: permissions.map((p) => p._id) } },
      { upsert: true, new: true },
    );
  }
}
