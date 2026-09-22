import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { Role } from '../models/Role.js';

const router = Router();

const createRoleSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

router.get('/', requireAuth, requirePermission('users.view'), async (_req, res, next) => {
  try {
    const roles = await Role.find({}).lean();
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requirePermission('users.create'), validateBody(createRoleSchema), async (req, res, next) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
});

export default router;
