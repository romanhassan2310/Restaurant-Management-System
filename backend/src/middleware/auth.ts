import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roleIds: string[];
    permissionKeys: string[];
    branchIds: string[];
  };
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401));
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      roleIds: payload.roleIds || [],
      permissionKeys: payload.permissionKeys || [],
      branchIds: payload.branchIds || [],
    };
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401, error));
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!req.user.permissionKeys.includes(permission)) {
      next(new AppError(`Missing required permission: ${permission}`, 403));
      return;
    }

    next();
  };
}

export function requireBranchAccess(branchId?: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (branchId && !req.user.branchIds.includes(branchId)) {
      next(new AppError('Access to this branch is not allowed', 403));
      return;
    }

    next();
  };
}

export async function loadUserContext(userId: string) {
  return User.findById(userId).populate('roles');
}
