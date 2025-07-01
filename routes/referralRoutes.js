import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  applyReferralCode, 
  getMyReferrals,
  validateReferralCode,
  getMyReferralCode
} from '../controllers/referralController.js';

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Test route
router.get('/test-route', (req, res) => {
  console.log('Test route hit!');
  res.json({ success: true, message: 'Test route works!' });
});

// Get user's referral code
router.get('/my-code', protect, getMyReferralCode);

// Generate referral code for current user (kept for backward compatibility)
router.post('/generate-code', protect, getMyReferralCode);

// Apply a referral code (public route, but requires user to be logged in)
router.post('/apply', protect, applyReferralCode);

// Get current user's referral stats and list
router.get('/my-referrals', protect, getMyReferrals);

// Validate a referral code (public endpoint)
router.get('/validate', validateReferralCode);

// Log all registered routes
console.log('Registered referral routes:');
router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    const methods = Object.keys(r.route.methods).map(method => method.toUpperCase()).join(', ');
    console.log(`${methods.padEnd(6)} /api/referrals${r.route.path}`);
  }
});

export default router;