import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roles: z.array(z.string()).optional(),
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash -refreshTokenHash');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, requirePermission('users.view'), async (_req, res, next) => {
  try {
    const users = await User.find({}).select('-passwordHash -refreshTokenHash').lean();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requirePermission('users.create'), validateBody(createUserSchema), async (req, res, next) => {
  try {
    const payload = req.body;
    const user = await User.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      passwordHash: payload.password,
      roles: payload.roles ?? [],
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
