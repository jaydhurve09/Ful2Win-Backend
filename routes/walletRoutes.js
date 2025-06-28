import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as walletController from '../controllers/walletController.js';

const Walletroute = express.Router();

// Protected routes (require authentication)
//route.use(protect);

// Create Razorpay order
Walletroute.post('/create-order', walletController.createRazorpayOrder);

// Verify payment and update wallet
Walletroute.post('/verify-payment', walletController.verifyAndUpdateWallet);

// Get wallet balance
Walletroute.get('/balance', walletController.getWalletBalance);

export default Walletroute;
