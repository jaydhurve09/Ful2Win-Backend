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
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    // If user doesn't have a referral code, generate and save one
    if (!user.referralCode) {
      user.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await user.save();
      console.log(`[getMyReferralCode] Generated new referral code for user ${userId}: ${user.referralCode}`);
    }
    res.status(200).json({
      success: true,
      referralCode: user.referralCode
    });
  } catch (error) {
    console.error('[getMyReferralCode] Error getting referral code:', error);
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
    if (!req.user || !req.user._id) {
      console.warn('[getMyReferrals] No user in request. Unauthorized.');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: user not authenticated',
      });
    }

    const userId = req.user._id;
    console.log(`[getMyReferrals] userId: ${userId}`);

    let user = await User.findById(userId);
    if (!user) {
      console.warn(`[getMyReferrals] User not found for id: ${userId}`);
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!user.referralCode) {
      user.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await user.save();
      console.log(`[getMyReferrals] Generated new referral code for user ${userId}: ${user.referralCode}`);
    }

    const referrals = await Referral.find({ referrer: userId })
      .populate('referredUser', 'fullName email phoneNumber')
      .sort({ createdAt: -1 });
    console.log(`[getMyReferrals] Found ${referrals.length} referrals for user ${userId}`);

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(ref => ref.rewardGiven).length;
    const pendingReferrals = totalReferrals - activeReferrals;

    res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      totalReferrals,
      activeReferrals,
      pendingReferrals,
      totalEarnings: activeReferrals * 50, // 50 coins per successful referral
      referrals: referrals.map(ref => ({
        id: ref._id,
        user: ref.referredUser,
        joinedAt: ref.createdAt,
        status: ref.rewardGiven ? 'active' : 'pending',
        rewardAmount: ref.rewardAmount,
        firstDepositAt: ref.firstDepositAt
      })),
    });
  } catch (error) {
    console.error('[getMyReferrals] Error getting referral data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
// @param   {ClientSession} session - MongoDB session for transaction
// @access  Private
// Reward amounts in coins
const REFERRER_REWARD = 200;
const REFEREE_REWARD = 100;

const processReferralRewards = async (userId, session) => {
  const sessionToUse = session || await mongoose.startSession();
  let shouldEndSession = !session;
  
  if (shouldEndSession) {
    sessionToUse.startTransaction();
  }

  try {
    console.log(`Processing referral rewards for user: ${userId}`);
    
    // Find the user who made the deposit
    const user = await User.findById(userId).session(sessionToUse);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user was referred by someone
    if (!user.referredBy) {
      console.log('User was not referred by anyone');
      return { success: true, message: 'No referral to process' };
    }

    // Find the referral record
    const referral = await Referral.findOne({
      referredUser: user._id,
      rewardGiven: false
    }).session(sessionToUse);

    if (!referral) {
      console.log('No pending referral found or rewards already given');
      if (shouldEndSession) {
        await sessionToUse.abortTransaction();
        sessionToUse.endSession();
      }
      return { success: false, message: 'No pending referral or rewards already given' };
    }

    // Find the referrer's user document
    const referrer = await User.findById(referral.referrer).session(sessionToUse);
    if (!referrer) {
      throw new Error('Referrer not found');
    }

    // Update the referral record to mark rewards as given
    referral.rewardGiven = true;
    referral.firstDepositAt = new Date();
    referral.rewardAmount = REFERRER_REWARD;
    await referral.save({ session: sessionToUse });

    // Update the referrer's wallet (add 200 coins)
    let referrerWallet = await Wallet.findOne({ user: referrer._id }).session(sessionToUse);
    if (!referrerWallet) {
      referrerWallet = new Wallet({
        user: referrer._id,
        balance: 0,
        transactions: []
      });
    }
    
    referrerWallet.balance += REFERRER_REWARD;
    referrerWallet.transactions.push({
      amount: REFERRER_REWARD,
      type: 'credit',
      description: `Referral bonus for ${user.fullName || user.phoneNumber}`,
      reference: `REF-${referrer._id}-${Date.now()}`,
      status: 'completed'
    });
    await referrerWallet.save({ session: sessionToUse });

    // Update the referred user's wallet (add 100 coins)
    let userWallet = await Wallet.findOne({ user: user._id }).session(sessionToUse);
    if (!userWallet) {
      userWallet = new Wallet({
        user: user._id,
        balance: 0,
        transactions: []
      });
    }
    
    userWallet.balance += REFEREE_REWARD;
    userWallet.transactions.push({
      amount: REFEREE_REWARD,
      type: 'credit',
      description: 'Welcome bonus for using a referral code',
      reference: `WELCOME-${user._id}-${Date.now()}`,
      status: 'completed'
    });
    await userWallet.save({ session: sessionToUse });

    // Mark user as having received their first deposit bonus
    user.hasMadeFirstDeposit = true;
    await user.save({ session: sessionToUse });

    // Commit the transaction if we started it
    if (shouldEndSession) {
      await sessionToUse.commitTransaction();
      sessionToUse.endSession();
    }

    console.log(`Successfully processed referral rewards for user: ${userId}`);
    return {
      success: true,
      message: 'Referral rewards processed successfully',
      referrerReward: REFERRER_REWARD,
      refereeReward: REFEREE_REWARD
    };
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