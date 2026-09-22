import { Router } from 'express';
import { crmController } from '../controllers/crmController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public / Guest endpoints (e.g. QR lead capture or promo check)
router.post('/qr-leads', (req, res) => crmController.captureQrLead(req, res));
router.post('/promotions/validate', (req, res) => crmController.validatePromotionCode(req, res));

// Authenticated CRM routes
router.use(requireAuth);

// Customers
router.get('/customers', (req, res) => crmController.getCustomers(req, res));
router.post('/customers', (req, res) => crmController.createCustomer(req, res));
router.get('/customers/:id', (req, res) => crmController.getCustomerById(req, res));
router.put('/customers/:id', (req, res) => crmController.updateCustomer(req, res));
router.delete('/customers/:id', (req, res) => crmController.deleteCustomer(req, res));
router.get('/customers/:id/history', (req, res) => crmController.getCustomerHistory(req, res));
router.post('/customers/:id/credit', (req, res) => crmController.adjustCredit(req, res));

// Customer Groups
router.get('/groups', (req, res) => crmController.getCustomerGroups(req, res));
router.post('/groups', (req, res) => crmController.createCustomerGroup(req, res));
router.put('/groups/:id', (req, res) => crmController.updateCustomerGroup(req, res));
router.delete('/groups/:id', (req, res) => crmController.deleteCustomerGroup(req, res));

// Promotions Management
router.get('/promotions', (req, res) => crmController.getPromotions(req, res));
router.post('/promotions', (req, res) => crmController.createPromotion(req, res));
router.put('/promotions/:id', (req, res) => crmController.updatePromotion(req, res));
router.delete('/promotions/:id', (req, res) => crmController.deletePromotion(req, res));

export const crmRoutes = router;
