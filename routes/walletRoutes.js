import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as walletController from '../controllers/walletController.js';

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Create Razorpay order
router.post('/create-order', walletController.createRazorpayOrder);

// Verify payment and update wallet
router.post('/verify-payment', walletController.verifyAndUpdateWallet);

// Get wallet balance
router.get('/balance', walletController.getWalletBalance);

export default router;
