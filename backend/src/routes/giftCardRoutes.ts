import { Router } from 'express';
import { giftCardController } from '../controllers/giftCardController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Lookup code (can be called during checkout by POS or QR)
router.get('/lookup/:code', (req, res) => giftCardController.lookupGiftCard(req, res));

router.use(requireAuth);

router.get('/', (req, res) => giftCardController.getGiftCards(req, res));
router.post('/issue', (req, res) => giftCardController.issueGiftCard(req, res));
router.post('/redeem', (req, res) => giftCardController.redeemGiftCard(req, res));
router.get('/:id/history', (req, res) => giftCardController.getGiftCardHistory(req, res));

export const giftCardRoutes = router;
