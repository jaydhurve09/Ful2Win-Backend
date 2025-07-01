import User from '../models/User.js';
import Referral from '../models/Referral.js';
import Wallet from '../models/Wallet.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

// @desc    Generate a referral code for the current user
// @route   POST /api/referrals/generate-code
// @access  Private
const generateReferralCode = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // If user already has a referral code, return it
    if (user.referralCode) {
      return res.status(200).json({
        success: true,
        message: 'Referral code already exists',
        referralCode: user.referralCode
      });
    }
    
    // Generate a new referral code (6-8 alphanumeric characters)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Save the referral code to the user
    user.referralCode = code;
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Referral code generated successfully',
      referralCode: code
    });
    
  } catch (error) {
    console.error('Error generating referral code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate referral code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// In referralController.js
const getMyReferralCode = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user with referral code
    const user = await User.findById(userId).select('referralCode');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // If user doesn't have a referral code yet (should be handled by pre-save hook)
    if (!user.referralCode) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate referral code'
      });
    }
    
    res.status(200).json({
      success: true,
      referralCode: user.referralCode
    });
    
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Apply a referral code during signup
// @route   POST /api/referrals/apply
// @access  Public
const applyReferralCode = async (req, res) => {
  try {
    const { referralCode, userId } = req.body;
    
    if (!referralCode || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Referral code and user ID are required'
      });
    }
    
    // Find the referrer by their referral code
    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code'
      });
    }
    
    // Check if user is trying to use their own referral code
    if (referrer._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot use your own referral code'
      });
    }
    
    // Check if user was already referred
    const referredUser = await User.findById(userId);
    if (referredUser.referredBy) {
      return res.status(400).json({
        success: false,
        error: 'You have already used a referral code'
      });
    }
    
    // Create referral record
    const referral = new Referral({
      referrer: referrer._id,
      referredUser: userId,
      referralCode
    });
    
    await referral.save();
    
    // Update referred user's record
    referredUser.referredBy = referrer._id;
    await referredUser.save();
    
    res.status(200).json({
      success: true,
      message: 'Referral code applied successfully'
    });
    
  } catch (error) {
    console.error('Error applying referral code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply referral code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's referral stats and list
// @route   GET /api/referrals/my-referrals
// @access  Private
const getMyReferrals = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's referral code if not exists, generate one
    let user = await User.findById(userId);
    if (!user.referralCode) {
      // Generate a new referral code
      user.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await user.save();
    }
    
    // Get all referrals for this user
    const referrals = await Referral.find({ referrer: userId })
      .populate('referredUser', 'fullName email phoneNumber')
      .sort({ createdAt: -1 });
    
    // Calculate stats
    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(ref => ref.rewardGiven).length;
    const pendingReferrals = totalReferrals - activeReferrals;
    
    res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      stats: {
        totalReferrals,
        activeReferrals,
        pendingReferrals,
        earnedCoins: activeReferrals * 50 // 50 coins per successful referral
      },
      referrals: referrals.map(ref => ({
        id: ref._id,
        user: ref.referredUser,
        joinedAt: ref.createdAt,
        status: ref.rewardGiven ? 'active' : 'pending',
        rewardAmount: ref.rewardAmount,
        firstDepositAt: ref.firstDepositAt
      }))
    });
    
  } catch (error) {
    console.error('Error getting referral data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Validate a referral code
// @route   GET /api/referrals/validate
// @access  Public
const validateReferralCode = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }
    
    // Check if code matches the format (6-10 alphanumeric chars, case insensitive)
    const codeRegex = /^[A-Z0-9]{6,10}$/i;
    if (!codeRegex.test(code)) {
      return res.status(200).json({
        valid: false,
        message: 'Invalid referral code format'
      });
    }
    
    // Check if code exists in the database
    const user = await User.findOne({ 
      referralCode: code.toUpperCase() 
    });
    
    if (!user) {
      return res.status(200).json({
        valid: false,
        message: 'Referral code not found'
      });
    }
    
    // Check if user is trying to use their own referral code
    if (req.user && req.user._id.toString() === user._id.toString()) {
      return res.status(200).json({
        valid: false,
        message: 'You cannot use your own referral code'
      });
    }
    
    return res.status(200).json({
      valid: true,
      message: 'Valid referral code',
      referrer: {
        id: user._id,
        name: user.fullName || `User${user.phoneNumber.slice(-4)}`
      }
    });
    
  } catch (error) {
    console.error('Error validating referral code:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while validating referral code'
    });
  }
};

// @desc    Process referral rewards when a referred user makes their first deposit
// @param   {string} userId - The ID of the user who made the deposit
// @access  Private
// Reward amounts in coins
const REFERRER_BONUS = 50;
const REFERRED_USER_BONUS = 50;

const processReferralRewards = async (userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find the referral record for this user
    const referral = await Referral.findOne({ 
      referredUser: userId,
      status: 'pending',
      rewardGiven: false 
    }).session(session);

    if (!referral) {
      await session.abortTransaction();
      session.endSession();
      return null;
    }

    // 1. Update the referral status to completed
    referral.status = 'completed';
    referral.rewardGiven = true;
    referral.firstDepositAt = new Date();
    referral.rewardAmount = REFERRER_BONUS; // Store the reward amount
    await referral.save({ session });

    // 2. Reward the referrer
    await Wallet.findOneAndUpdate(
      { user: referral.referrer },
      { 
        $inc: { balance: REFERRER_BONUS },
        $push: {
          transactions: {
            amount: REFERRER_BONUS,
            type: 'credit',
            description: 'Referral bonus',
            reference: `REF_${referral._id}`,
            status: 'completed',
            createdAt: new Date()
          }
        }
      },
      { new: true, upsert: true, session }
    );

    // 3. Reward the referred user
    await Wallet.findOneAndUpdate(
      { user: userId },
      { 
        $inc: { balance: REFERRED_USER_BONUS },
        $push: {
          transactions: {
            amount: REFERRED_USER_BONUS,
            type: 'credit',
            description: 'Signup bonus (referred by friend)',
            reference: `REF_BONUS_${referral._id}`,
            status: 'completed',
            createdAt: new Date()
          }
        }
      },
      { new: true, upsert: true, session }
    );

    // 4. Update user's referral stats
    await User.findByIdAndUpdate(
      referral.referrer,
      { $inc: { 'referralStats.earnedCoins': REFERRER_BONUS } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log(`Successfully processed referral rewards for user ${userId}. Referrer: ${referral.referrer}`);
    return referral;
  } catch (error) {
    console.error('Error processing referral rewards:', error);
    throw error;
  }
};

// Export all functions at once to avoid any duplicate exports
export {
  generateReferralCode,
  getMyReferralCode,
  applyReferralCode,
  getMyReferrals,
  validateReferralCode,
  processReferralRewards
};