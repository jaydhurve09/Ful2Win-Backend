import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { followUser, checkIfFollowing } from '../controllers/followController.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

/**
 * @route   POST /api/users/:userId/follow
 * @desc    Follow or unfollow a user
 * @access  Private
 */
router.post('/:userId/follow', followUser);

/**
 * @route   GET /api/users/:userId/is-following
 * @desc    Check if current user is following another user
 * @access  Private
 */
router.get('/:userId/is-following', checkIfFollowing);

export default router;
