import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  checkUsername,
  getUserProfile,
  getCurrentUserProfile,
  updateUserProfile,
  getUsers,
  getUserPosts,
  getProfilePicture
} from '../controllers/userController.js';
import { protect, admin, testToken } from '../middleware/authMiddleware.js';
import { uploadSingle } from '../middleware/uploadMiddleware.js';
import User from '../models/User.js';

process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.name}: ${err.message}`);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/check-username/:username', checkUsername);
router.get('/:userId/posts', getUserPosts);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Test endpoint to check request body parsing
router.post('/test-body', (req, res) => {
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
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/test-token', testToken);

// Protected routes
router.use(protect);
router.get('/me', getCurrentUserProfile);
router.get('/profile/:userId', getUserProfile);
router.put(
  '/profile/:userId',
  (req, res, next) => {
    uploadSingle('profilePicture')(req, res, function (err) {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: 'File too large. Maximum size is 5MB.'
          });
        } else if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(415).json({
            success: false,
            message: 'Invalid file type. Only images are allowed.'
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Error uploading file',
            error: err.message
          });
        }
      }
      next();
    });
  },
  (req, res, next) => {
    try {
      if (req.body.data) {
        try {
          const parsedData = JSON.parse(req.body.data);
          req.body = { ...req.body, ...parsedData };
          delete req.body.data;
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Invalid JSON data in form field',
            error: e.message
          });
        }
      }
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error processing request',
        error: error.message
      });
    }
  },
  updateUserProfile
);
router.get('/:userId/posts', protect, getUserPosts);
router.get('/profile-picture/:userId', getProfilePicture);
router.get('/community', getUsers);

// Admin routes
router.use(admin);
router.get('/', getUsers);

// Error handling middleware for user routes
router.use((err, req, res, next) => {
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
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default router;
