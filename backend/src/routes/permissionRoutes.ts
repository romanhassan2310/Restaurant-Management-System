import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { Permission } from '../models/Permission.js';

const router = Router();

const createPermissionSchema = z.object({
  key: z.string().min(2),
  description: z.string().min(2),
});

router.get('/', requireAuth, requirePermission('users.view'), async (_req, res, next) => {
  try {
    const permissions = await Permission.find({}).lean();
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requirePermission('users.create'), validateBody(createPermissionSchema), async (req, res, next) => {
  try {
    const permission = await Permission.create(req.body);
    res.status(201).json({ success: true, data: permission });
  } catch (error) {
    next(error);
  }
});

export default router;
