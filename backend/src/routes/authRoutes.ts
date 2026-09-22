import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.js';
import { changePassword, issuePasswordResetToken, loginUser, logoutUser, refreshAccessToken, resetPassword } from '../services/authService.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password, req.ip);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error instanceof Error ? new AppError('Invalid credentials', 401, error.message) : new AppError('Invalid credentials', 401));
  }
});

router.post('/refresh-token', validateBody(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await refreshAccessToken(refreshToken, req.ip);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error instanceof Error ? new AppError('Refresh failed', 401, error.message) : new AppError('Refresh failed', 401));
  }
});

router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await logoutUser(req.user!.id, req.ip);
    res.json({ success: true, data: null, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', requireAuth, validateBody(changePasswordSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await changePassword(req.user!.id, currentPassword, newPassword, req.ip);
    res.json({ success: true, data: null, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', validateBody(resetPasswordRequestSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await issuePasswordResetToken(email);
    res.json({ success: true, data: result, message: 'Password reset token generated if the account exists' });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    await resetPassword(token, newPassword, req.ip);
    res.json({ success: true, data: null, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
