import Challenge from '../models/Challenge.js';
import User from '../models/User.js';
import { Game } from '../models/Game.js';

// @desc    Create a new challenge
// @route   POST /api/challenges
// @access  Private
const createChallenge = async (req, res) => {
  try {
    const { challengedUserId, gameId, message } = req.body;
    const challengerId = req.user.id;

    // Validate required fields
    if (!challengedUserId || !gameId) {
      return res.status(400).json({
        success: false,
        message: 'Challenged user and game are required'
      });
    }

    // Check if challenged user exists
    const challengedUser = await User.findById(challengedUserId);
    if (!challengedUser) {
      return res.status(404).json({
        success: false,
        message: 'Challenged user not found'
      });
    }

    // Check if game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check if user is challenging themselves
    if (challengerId === challengedUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot challenge yourself'
      });
    }

    // Check if there's already a pending challenge between these users for this game
    const existingChallenge = await Challenge.findOne({
      challenger: challengerId,
      challenged: challengedUserId,
      game: gameId,
      status: 'pending'
    });

    if (existingChallenge) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending challenge for this game with this user'
      });
    }

    // Create the challenge
    const challenge = await Challenge.create({
      challenger: challengerId,
      challenged: challengedUserId,
      game: gameId,
      message: message || ''
    });

    // Populate the challenge with user and game details
    await challenge.populate([
      { path: 'challenger', select: 'fullName profilePicture' },
      { path: 'challenged', select: 'fullName profilePicture' },
      { path: 'game', select: 'displayName name thumbnail' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Challenge sent successfully',
      challenge
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all challenges for the current user
// @route   GET /api/challenges
// @access  Private
const getUserChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type } = req.query;

    let query = {
      $or: [{ challenger: userId }, { challenged: userId }]
    };

    // Filter by status if provided
    if (status && ['pending', 'accepted', 'rejected', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }

    // Filter by type (incoming/outgoing)
    if (type === 'incoming') {
      query = { challenged: userId, status: 'pending' };
    } else if (type === 'outgoing') {
      query = { challenger: userId, status: 'pending' };
    }

    const challenges = await Challenge.find(query)
      .populate('challenger', 'fullName profilePicture')
      .populate('challenged', 'fullName profilePicture')
      .populate('game', 'displayName name thumbnail')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      challenges
    });
  } catch (error) {
    console.error('Error getting user challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Accept a challenge
// @route   PUT /api/challenges/:id/accept
// @access  Private
const acceptChallenge = async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.user.id;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Check if the current user is the challenged user
    if (challenge.challenged.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept challenges sent to you'
      });
    }

    // Check if challenge is still pending
    if (challenge.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Challenge is no longer pending'
      });
    }

    // Update challenge status
    challenge.status = 'accepted';
    await challenge.save();

    // Populate the challenge with user and game details
    await challenge.populate([
      { path: 'challenger', select: 'fullName profilePicture' },
      { path: 'challenged', select: 'fullName profilePicture' },
      { path: 'game', select: 'displayName name thumbnail' }
    ]);

    res.json({
      success: true,
      message: 'Challenge accepted successfully',
      challenge
    });
  } catch (error) {
    console.error('Error accepting challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Reject a challenge
// @route   PUT /api/challenges/:id/reject
// @access  Private
const rejectChallenge = async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.user.id;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Check if the current user is the challenged user
    if (challenge.challenged.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject challenges sent to you'
      });
    }

    // Check if challenge is still pending
    if (challenge.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Challenge is no longer pending'
      });
    }

    // Update challenge status
    challenge.status = 'rejected';
    await challenge.save();

    res.json({
      success: true,
      message: 'Challenge rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cancel a challenge
// @route   PUT /api/challenges/:id/cancel
// @access  Private
const cancelChallenge = async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.user.id;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Check if the current user is the challenger
    if (challenge.challenger.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel challenges you created'
      });
    }

    // Check if challenge is still pending
    if (challenge.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Challenge is no longer pending'
      });
    }

    // Update challenge status
    challenge.status = 'cancelled';
    await challenge.save();

    res.json({
      success: true,
      message: 'Challenge cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get users for challenge suggestions
// @route   GET /api/challenges/users
// @access  Private
const getUsersForChallenge = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search } = req.query;

    let query = {
      _id: { $ne: userId }, // Exclude current user
      isActive: true
    };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('fullName username profilePicture')
      .limit(20)
      .sort({ fullName: 1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error getting users for challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get games for challenge
// @route   GET /api/challenges/games
// @access  Private
const getGamesForChallenge = async (req, res) => {
  try {
    const { search } = req.query;

    let query = {
      status: { $ne: 'inactive' } // Only active games
    };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const games = await Game.find(query)
      .select('displayName name thumbnail type')
      .limit(20)
      .sort({ displayName: 1 });

    res.json({
      success: true,
      games
    });
  } catch (error) {
    console.error('Error getting games for challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export {
  createChallenge,
  getUserChallenges,
  acceptChallenge,
  rejectChallenge,
  cancelChallenge,
  getUsersForChallenge,
  getGamesForChallenge
}; 