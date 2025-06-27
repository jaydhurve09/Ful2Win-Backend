import Wallet from '../models/Wallet.js'; 
import { createOrder, verifyPayment } from '../utils/razorpay.js';

// @desc    Create Razorpay order
// @route   POST /api/wallet/create-order
// @access  Private
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    //const userId = req.user._id;
    const userId = "1234khuyg";

    if (!amount || isNaN(amount) || amount < 1) {
      return res.status(400).json({ 
        success: false,
        error: 'Please provide a valid amount (minimum ₹10)' 
      });
    }

    // Create receipt with user ID and timestamp
    const receipt = `wallet_${userId}_${Date.now()}`;
    
    // Create Razorpay order
    const order = await createOrder(amount, 'INR', receipt);

    res.status(200).json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error creating payment order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify payment and update wallet
// @route   POST /api/wallet/verify-payment
// @access  Private
const verifyAndUpdateWallet = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      amount 
    } = req.body;
    
    const userId = req.user._id;

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required payment details' 
      });
    }

    // Verify payment
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment verification' 
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find or create wallet
      let wallet = await Wallet.findOne({ user: userId }).session(session);
      
      if (!wallet) {
        wallet = new Wallet({
          user: userId,
          balance: 0,
          transactions: []
        });
      }

      // Update wallet balance
      wallet.balance += parseFloat(amount);
      
      // Add transaction record
      wallet.transactions.push({
        amount: parseFloat(amount),
        type: 'credit',
        description: 'Wallet top-up via Razorpay',
        reference: razorpay_payment_id,
        status: 'completed'
      });

      await wallet.save({ session });
      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        message: 'Wallet updated successfully',
        wallet: {
          balance: wallet.balance,
          updatedAt: wallet.updatedAt
        }
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error updating wallet:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error updating wallet',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
const getWalletBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    
    res.status(200).json({
      success: true,
      balance: wallet ? wallet.balance : 0,
      wallet: wallet || { balance: 0, transactions: [] }
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching wallet balance'
    });
  }
};

export {
  createRazorpayOrder,
  verifyAndUpdateWallet,
  getWalletBalance
};
