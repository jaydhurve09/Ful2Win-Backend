import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {createRazorpayOrder, verifyAndUpdateWallet, getWalletBalance} from '../controllers/walletController.js';
const walletRouter = express.Router();


// Protected routes (require authentication)
router.use(protect);

// Create Razorpay order
router.post('/create-order', createRazorpayOrder);

// Verify payment and update wallet
router.post('/verify-payment',verifyAndUpdateWallet);

// Get wallet balance
router.get('/balance', getWalletBalance);

export  default router;
