const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const walletController = require('../controllers/walletController');

// Protected routes (require authentication)
router.use(protect);

// Create Razorpay order
router.post('/create-order', walletController.createRazorpayOrder);

// Verify payment and update wallet
router.post('/verify-payment', walletController.verifyAndUpdateWallet);

// Get wallet balance
router.get('/balance', walletController.getWalletBalance);

module.exports = router;
