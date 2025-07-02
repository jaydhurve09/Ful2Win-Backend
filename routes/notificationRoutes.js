import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import notificationController from '../controllers/notificationController.js';

const {
  getUserNotifications,
  markNotificationsAsRead
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

export default router;
