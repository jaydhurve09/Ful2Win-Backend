import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  createRazorpayOrder, 
  verifyAndUpdateWallet, 
  getWalletBalance,
  updateSpinReward 
} from '../controllers/walletController.js';

const router = express.Router();

// Protected routes (require authentication)
// router.use(protect);

// Create Razorpay order
router.post('/create-order', createRazorpayOrder);

// Verify payment and update wallet
router.post('/verify-payment', verifyAndUpdateWallet);

// Get wallet balance
router.get('/balance', getWalletBalance);

// Update wallet from spin wheel reward
router.post('/spin-reward', protect, updateSpinReward);

export default router;
