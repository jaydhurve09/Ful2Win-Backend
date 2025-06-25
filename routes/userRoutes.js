import express from 'express';
import { 
  registerUser, 
  loginUser,
  logoutUser,
  getUserProfile,
  getCurrentUserProfile,
  updateUserProfile,
  getUsers,
  getUserPosts
} from '../controllers/userController.js';
import { protect, admin, testToken } from '../middleware/authMiddleware.js';
import { upload, handleMulterError } from '../middleware/uploadMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Test endpoint to check request body parsing
router.post('/test-body', (req, res) => {
  console.log('=== Test Body Endpoint ===');
  console.log('Headers:', req.headers);
  console.log('Raw body:', req.body);
  console.log('Body type:', typeof req.body);
  
  res.json({
    success: true,
    headers: req.headers,
    body: req.body,
    bodyType: typeof req.body,
    rawHeaders: req.rawHeaders
  });
});

// Temporary route to check user existence (remove in production)
router.get('/check-user/:phoneNumber', async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.params.phoneNumber });
    if (user) {
      res.json({ 
        exists: true, 
        user: { 
          _id: user._id, 
          phoneNumber: user.phoneNumber,
          fullName: user.fullName 
        } 
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   GET /api/users/test-token
 * @desc    Test JWT token verification
 * @access  Public
 */
router.get('/test-token', testToken);

// Protected routes
router.use(protect);

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', getCurrentUserProfile);

/**
 * @route   GET /api/users/profile/:userId
 * @desc    Get user profile by ID
 * @access  Private
 */
router.get('/profile/:userId', getUserProfile);

/**
 * @route   PUT /api/users/profile/:userId
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile/:userId', 
  protect, // Ensure user is authenticated
  (req, res, next) => {
    // Handle file upload first
    upload(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  updateUserProfile
);

/**
 * @route   GET /api/users/:userId/posts
 * @desc    Get posts by user
 * @access  Private
 */
router.get('/:userId/posts', getUserPosts);

// Admin routes
router.use(admin);

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/', getUsers);

// Error handling middleware for user routes
router.use((err, req, res, next) => {
  console.error('User route error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default router;
