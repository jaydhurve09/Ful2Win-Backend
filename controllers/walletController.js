import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js'; 
import User from '../models/User.js';
import { createOrder, verifyPayment } from '../utils/razorpay.js';
import { processReferralRewards } from './referralController.js';

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
      
      // Check if this is user's first deposit
    const user = await User.findById(userId).session(session);
    const isFirstDeposit = !user.hasMadeFirstDeposit;
    
    // Update wallet balance
    wallet.balance += parseFloat(amount);
    
    // Process referral rewards if this is the first deposit
    if (isFirstDeposit && user.referredBy) {
      try {
        // Import the referral controller
        const { processReferralRewards } = await import('./referralController.js');
        
        // Process the referral rewards
        await processReferralRewards(user._id.toString(), session);
        
        // Mark user as having made their first deposit
        user.hasMadeFirstDeposit = true;
        await user.save({ session });
        
        console.log(`Processed referral rewards for user: ${user._id}`);
      } catch (error) {
        console.error('Error processing referral rewards:', error);
        // Don't fail the transaction if referral rewards fail
      }
    }
      wallet.transactions.push({
        amount,
        type: 'credit',
        description: 'Deposit via Razorpay',
        reference: `RZP_${razorpay_payment_id}`,
        status: 'completed'
      });
      
      await wallet.save();
      
      // Process referral rewards if this is the first deposit
      if (isFirstDeposit) {
        try {
          await processReferralRewards(userId);
        } catch (error) {
          console.error('Error processing referral rewards:', error);
          // Don't fail the transaction if referral processing fails
        }
      }
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

// @desc    Update wallet balance from spin wheel reward
// @route   POST /api/wallet/spin-reward
// @access  Private
const updateSpinReward = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid reward amount'
      });
    }

    // Find user's wallet or create if it doesn't exist
    let wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
      wallet = new Wallet({
        user: userId,
        balance: 0,
        transactions: []
      });
    }

    // Update balance
    wallet.balance += amount;
    
    // Add transaction record
    wallet.transactions.push({
      amount,
      type: 'credit',
      description: `Spin wheel reward: ${amount} coins`,
      reference: `spin_${Date.now()}`,
      status: 'completed'
    });

    await wallet.save();

    res.status(200).json({
      success: true,
      balance: wallet.balance,
      message: `Successfully added ${amount} coins to your wallet`
    });
  } catch (error) {
    console.error('Error updating spin reward:', error);
    res.status(500).json({
      success: false,
      error: 'Error processing spin reward',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export {
  createRazorpayOrder,
  verifyAndUpdateWallet,
  getWalletBalance,
  updateSpinReward
};
