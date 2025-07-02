import User from '../models/User.js';
import { notifyNewFollower } from './notificationController.js';
import mongoose from 'mongoose';

/**
 * @desc    Follow or unfollow a user
 * @route   POST /api/users/:userId/follow
 * @access  Private
 */
const followUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId: currentUserId } = req.user; // The user who is following
    const { userId: targetUserId } = req.params; // The user to follow/unfollow

    // Validate user IDs
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId).session(session);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already following
    const currentUser = await User.findById(currentUserId).session(session);
    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(
        currentUserId,
        { $pull: { following: targetUserId } },
        { session }
      );

      await User.findByIdAndUpdate(
        targetUserId,
        { $pull: { followers: currentUserId } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: 'Successfully unfollowed user',
        isFollowing: false
      });
    } else {
      // Follow
      await User.findByIdAndUpdate(
        currentUserId,
        { $addToSet: { following: targetUserId } },
        { session }
      );

      await User.findByIdAndUpdate(
        targetUserId,
        { $addToSet: { followers: currentUserId } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // Send notification to the user being followed
      await notifyNewFollower(currentUserId, targetUserId);

      return res.status(200).json({
        success: true,
        message: 'Successfully followed user',
        isFollowing: true
      });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error in followUser:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Check if current user is following another user
 * @route   GET /api/users/:userId/is-following
 * @access  Private
 */
const checkIfFollowing = async (req, res) => {
  try {
    const { userId: currentUserId } = req.user;
    const { userId: targetUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(currentUserId).select('following');
    const isFollowing = user.following.includes(targetUserId);

    res.status(200).json({
      success: true,
      isFollowing
    });
  } catch (error) {
    console.error('Error in checkIfFollowing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export { followUser, checkIfFollowing };
