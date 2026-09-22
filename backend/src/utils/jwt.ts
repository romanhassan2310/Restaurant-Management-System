import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
  roleIds: string[];
  permissionKeys: string[];
  branchIds: string[];
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '15m' });
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as JwtPayload;
}
