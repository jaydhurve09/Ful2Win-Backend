import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import notificationController from '../controllers/notificationController.js';

const {
  getUserNotifications,
  markNotificationsAsRead,
  sendCustomNotificationToUsers,
  broadcastNotification
} = notificationController;

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the current user
 * @access  Private
 */
router.get('/', async (req, res) => {
  // Forward to getUserNotifications with the current user's ID
  req.params.userId = req.user._id;
  return getUserNotifications(req, res);
});

/**
 * @route   GET /api/notifications/all
 * @desc    Get all notifications for a specific user (admin only)
 * @access  Private/Admin
 */
router.get('/all/:userId', protect, getUserNotifications);

/**
 * @route   POST /api/notifications/mark-read
 * @desc    Mark notifications as read
 * @access  Private
 */
router.post('/mark-read', markNotificationsAsRead);

/**
 * @route   POST /api/notifications/send-custom
 * @desc    Send a custom notification to specific users
 * @access  Private
 */
router.post('/send-custom', async (req, res) => {
  try {
    const { userIds, title, message, type, data } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }
    
    // Pass the request object to access socket.io
    const result = await sendCustomNotificationToUsers(userIds, title, message, type, data, req);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Notification sent to ${result.count} users`,
        notifications: result.notifications
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notifications',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending custom notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/broadcast
 * @desc    Broadcast a notification to all users
 * @access  Private
 */
router.post('/broadcast', async (req, res) => {
  try {
    const { title, message, type, data } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }
    
    // Pass the request object to access socket.io
    const result = await broadcastNotification(title, message, type, data, req);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Broadcast sent to ${result.count} users`,
        notifications: result.notifications
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to broadcast notification',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;
