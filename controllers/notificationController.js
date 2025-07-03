import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Tournament from '../models/Tournament.js';
import mongoose from 'mongoose';
import pkg from 'node-schedule';
const schedule = pkg.default || pkg;

// Map of scheduled jobs for tournament reminders
const tournamentReminderJobs = new Map();

/**
 * @desc    Get all notifications for a user
 * @route   GET /api/notifications/:userId
 * @access  Private
 */
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID' 
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get notifications for the user, sorted by creation date (newest first)
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

/**
 * @desc    Mark notifications as read
 * @route   POST /api/notifications/mark-read
 * @access  Private
 */
const markNotificationsAsRead = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { notificationIds } = req.body;
    const { userId } = req.user; // Assuming user is authenticated

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an array of notification IDs' 
      });
    }

    // Validate notification IDs
    const validIds = notificationIds.every(id => mongoose.Types.ObjectId.isValid(id));
    if (!validIds) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid notification ID(s)' 
      });
    }

    // Update all notifications to mark as read
    await Notification.updateMany(
      { 
        _id: { $in: notificationIds },
        user: userId // Ensure user can only mark their own notifications as read
      },
      { $set: { read: true } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Notifications marked as read',
      count: notificationIds.length
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// ==================== NOTIFICATION CREATION HELPERS ====================

/**
 * Create a new notification
 * @param {string} userId - ID of the user to notify
 * @param {string} type - Notification type
 * @param {string} message - Human-readable message
 * @param {object} data - Additional data related to the notification
 * @returns {Promise<object>} The created notification
 */
const createNotification = async (userId, type, message, data = {}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      message,
      data
    });
    
    // Here you would typically emit a real-time event (e.g., using Socket.io)
    // io.to(`user_${userId}`).emit('new_notification', notification);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Notify user when someone follows them
 * @param {string} followerId - ID of the user who followed
 * @param {string} followingId - ID of the user being followed
 */
export const notifyNewFollower = async (followerId, followingId) => {
  try {
    const follower = await User.findById(followerId).select('username fullName');
    if (!follower) return;

    await createNotification(
      followingId,
      'follow',
      `${follower.fullName || follower.username} started following you`,
      { followerId: follower._id }
    );
  } catch (error) {
    console.error('Error in notifyNewFollower:', error);
  }
};

/**
 * Notify user when challenged to a game
 * @param {string} challengerId - ID of the user who sent the challenge
 * @param {string} challengedId - ID of the user being challenged
 * @param {string} gameName - Name of the game
 * @param {string} gameId - ID of the game/match
 */
export const notifyNewChallenge = async (challengerId, challengedId, gameName, gameId) => {
  try {
    const challenger = await User.findById(challengerId).select('username fullName');
    if (!challenger) return;

    await createNotification(
      challengedId,
      'challenge',
      `${challenger.fullName || challenger.username} challenged you to a game of ${gameName}`,
      { 
        challengerId: challenger._id,
        gameId,
        gameName
      }
    );
  } catch (error) {
    console.error('Error in notifyNewChallenge:', error);
  }
};

/**
 * Notify followers when a user updates their profile picture
 * @param {string} userId - ID of the user who updated their profile
 */
export const notifyProfilePictureUpdate = async (userId) => {
  try {
    const user = await User.findById(userId).select('username fullName followers');
    if (!user || !user.followers || user.followers.length === 0) return;

    const notificationPromises = user.followers.map(followerId => 
      createNotification(
        followerId,
        'profile_update',
        `${user.fullName || user.username} updated their profile picture`,
        { userId: user._id }
      )
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error in notifyProfilePictureUpdate:', error);
  }
};

/**
 * Schedule tournament reminder notifications
 * @param {string} tournamentId - ID of the tournament
 * @param {Date} startTime - When the tournament starts
 * @param {string} tournamentName - Name of the tournament
 * @param {string[]} participantIds - Array of participant user IDs
 */
export const scheduleTournamentReminders = async (tournamentId, startTime, tournamentName, participantIds) => {
  try {
    // Cancel any existing reminders for this tournament
    cancelTournamentReminders(tournamentId);

    const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000);
    const threeMinutesBefore = new Date(startTime.getTime() - 3 * 60 * 1000);

    // Schedule 1-hour reminder
    const oneHourJob = schedule.scheduleJob(oneHourBefore, async () => {
      await createTournamentReminders(tournamentId, participantIds, tournamentName, '1 hour');
    });

    // Schedule 3-minute reminder
    const threeMinJob = schedule.scheduleJob(threeMinutesBefore, async () => {
      await createTournamentReminders(tournamentId, participantIds, tournamentName, '3 minutes');
    });

    // Store job references
    tournamentReminderJobs.set(`tournament_${tournamentId}_1h`, oneHourJob);
    tournamentReminderJobs.set(`tournament_${tournamentId}_3m`, threeMinJob);
  } catch (error) {
    console.error('Error scheduling tournament reminders:', error);
  }
};

/**
 * Create tournament reminder notifications for all participants
 * @private
 */
const createTournamentReminders = async (tournamentId, participantIds, tournamentName, timeLeft) => {
  try {
    const notificationPromises = participantIds.map(userId => 
      createNotification(
        userId,
        'tournament_reminder',
        `Tournament "${tournamentName}" starts in ${timeLeft}!`,
        { 
          tournamentId,
          tournamentName,
          timeLeft
        }
      )
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error creating tournament reminders:', error);
  }
};

/**
 * Cancel scheduled tournament reminders
 * @param {string} tournamentId - ID of the tournament
 */
export const cancelTournamentReminders = (tournamentId) => {
  const oneHourJob = tournamentReminderJobs.get(`tournament_${tournamentId}_1h`);
  const threeMinJob = tournamentReminderJobs.get(`tournament_${tournamentId}_3m`);

  if (oneHourJob) {
    oneHourJob.cancel();
    tournamentReminderJobs.delete(`tournament_${tournamentId}_1h`);
  }
  
  if (threeMinJob) {
    threeMinJob.cancel();
    tournamentReminderJobs.delete(`tournament_${tournamentId}_3m`);
  }
};

/**
 * Notify user of level up
 * @param {string} userId - ID of the user who leveled up
 * @param {number} newLevel - The new level
 */
export const notifyLevelUp = async (userId, newLevel) => {
  try {
    await createNotification(
      userId,
      'level_up',
      `🎉 Congratulations! You've reached level ${newLevel}!`,
      { level: newLevel }
    );
  } catch (error) {
    console.error('Error in notifyLevelUp:', error);
  }
};

/**
 * Notify user of achievement unlocked
 * @param {string} userId - ID of the user
 * @param {string} achievementName - Name of the achievement
 * @param {string} achievementDescription - Description of the achievement
 */
export const notifyAchievementUnlocked = async (userId, achievementName, achievementDescription) => {
  try {
    await createNotification(
      userId,
      'achievement',
      `🏆 Achievement Unlocked: ${achievementName} - ${achievementDescription}`,
      { 
        achievementName,
        achievementDescription
      }
    );
  } catch (error) {
    console.error('Error in notifyAchievementUnlocked:', error);
  }
};

export default {
  getUserNotifications,
  markNotificationsAsRead,
  notifyNewFollower,
  notifyNewChallenge,
  notifyProfilePictureUpdate,
  scheduleTournamentReminders,
  cancelTournamentReminders,
  notifyLevelUp,
  notifyAchievementUnlocked
};
