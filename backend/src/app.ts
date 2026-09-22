import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import posRoutes from './routes/posRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import kitchenRoutes from './routes/kitchenRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import { crmRoutes } from './routes/crmRoutes.js';
import { loyaltyRoutes } from './routes/loyaltyRoutes.js';
import { giftCardRoutes } from './routes/giftCardRoutes.js';
import { hrRoutes } from './routes/hrRoutes.js';
import { payrollRoutes } from './routes/payrollRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import cateringRoutes from './routes/cateringRoutes.js';
import quotationRoutes from './routes/quotationRoutes.js';
import mobileVanRoutes from './routes/mobileVanRoutes.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' } },
  }),
);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
  });
});

app.get('/api', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Restaurant Management System API',
      version: '1.0.0',
      environment: env.nodeEnv,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/gift-cards', giftCardRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/hr/payroll', payrollRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/catering', cateringRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/mobile-van', mobileVanRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
