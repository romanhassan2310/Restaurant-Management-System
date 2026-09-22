import { Router } from 'express';
import { loyaltyController } from '../controllers/loyaltyController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Tiers / Levels
router.get('/levels', (req, res) => loyaltyController.getLevels(req, res));
router.post('/levels', (req, res) => loyaltyController.createLevel(req, res));
router.put('/levels/:id', (req, res) => loyaltyController.updateLevel(req, res));
router.delete('/levels/:id', (req, res) => loyaltyController.deleteLevel(req, res));

// Rewards
router.get('/rewards', (req, res) => loyaltyController.getRewards(req, res));
router.post('/rewards', (req, res) => loyaltyController.createReward(req, res));
router.put('/rewards/:id', (req, res) => loyaltyController.updateReward(req, res));
router.delete('/rewards/:id', (req, res) => loyaltyController.deleteReward(req, res));

// Points Operations & History
router.post('/redeem', (req, res) => loyaltyController.redeemReward(req, res));
router.post('/adjust', (req, res) => loyaltyController.adjustPoints(req, res));
router.get('/customer/:customerId', (req, res) => loyaltyController.getCustomerLoyaltyHistory(req, res));
router.get('/transactions', (req, res) => loyaltyController.getAllTransactions(req, res));

export const loyaltyRoutes = router;
